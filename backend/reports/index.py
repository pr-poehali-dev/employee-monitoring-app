'''
Business: Формирование отчётов по рабочему времени и перемещениям
Args: event - dict с httpMethod, queryStringParameters
      context - объект с request_id
Returns: HTTP response dict с отчётами
'''

import json
import os
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def get_daily_report(date_str: str, conn) -> List[Dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT e.id, e.full_name, e.position, "
            "MIN(CASE WHEN ml.event_type = 'entry' THEN ml.event_datetime END) as first_entry, "
            "MAX(CASE WHEN ml.event_type = 'exit' THEN ml.event_datetime END) as last_exit, "
            "COUNT(CASE WHEN ml.event_type = 'entry' THEN 1 END) as entries_count, "
            "COUNT(CASE WHEN ml.event_type = 'exit' THEN 1 END) as exits_count "
            "FROM employees e "
            "LEFT JOIN movement_log ml ON e.id = ml.employee_id AND DATE(ml.event_datetime) = %s "
            "WHERE e.is_active = true "
            "GROUP BY e.id, e.full_name, e.position "
            "ORDER BY e.full_name",
            (date_str,)
        )
        results = cur.fetchall()
        
        report = []
        for row in results:
            row_dict = dict(row)
            
            if row_dict['first_entry'] and row_dict['last_exit']:
                duration = row_dict['last_exit'] - row_dict['first_entry']
                hours_worked = duration.total_seconds() / 3600
            else:
                hours_worked = 0
            
            row_dict['hours_worked'] = round(hours_worked, 2)
            row_dict['first_entry'] = row_dict['first_entry'].isoformat() if row_dict['first_entry'] else None
            row_dict['last_exit'] = row_dict['last_exit'].isoformat() if row_dict['last_exit'] else None
            
            report.append(row_dict)
        
        return report

def get_movement_history(employee_id: int, date_from: str, date_to: str, conn) -> List[Dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT ml.id, ml.event_type, ml.event_datetime, ml.deny_reason, "
            "c.name as checkpoint_name, e.full_name "
            "FROM movement_log ml "
            "JOIN employees e ON ml.employee_id = e.id "
            "LEFT JOIN checkpoints c ON ml.checkpoint_id = c.id "
            "WHERE ml.employee_id = %s AND DATE(ml.event_datetime) BETWEEN %s AND %s "
            "ORDER BY ml.event_datetime DESC",
            (employee_id, date_from, date_to)
        )
        results = cur.fetchall()
        return [dict(row) for row in results]

def get_violations_report(date_from: str, date_to: str, conn) -> List[Dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT e.id, e.full_name, e.position, "
            "DATE(ml.event_datetime) as work_date, "
            "MIN(CASE WHEN ml.event_type = 'entry' THEN ml.event_datetime END) as first_entry, "
            "e.work_start_time, "
            "CASE WHEN MIN(CASE WHEN ml.event_type = 'entry' THEN ml.event_datetime END) > "
            "(DATE(ml.event_datetime) + e.work_start_time) THEN true ELSE false END as is_late "
            "FROM movement_log ml "
            "JOIN employees e ON ml.employee_id = e.id "
            "WHERE DATE(ml.event_datetime) BETWEEN %s AND %s "
            "GROUP BY e.id, e.full_name, e.position, DATE(ml.event_datetime), e.work_start_time "
            "HAVING MIN(CASE WHEN ml.event_type = 'entry' THEN ml.event_datetime END) IS NOT NULL "
            "ORDER BY work_date DESC, e.full_name",
            (date_from, date_to)
        )
        results = cur.fetchall()
        
        violations = []
        for row in results:
            row_dict = dict(row)
            if row_dict['is_late']:
                violations.append(row_dict)
        
        return violations

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        report_type = params.get('type', 'daily')
        
        conn = get_db_connection()
        
        if report_type == 'daily':
            date_str = params.get('date', datetime.now().strftime('%Y-%m-%d'))
            report = get_daily_report(date_str, conn)
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'report_type': 'daily',
                    'date': date_str,
                    'data': report
                }, default=str, ensure_ascii=False)
            }
        
        elif report_type == 'history':
            employee_id = params.get('employee_id')
            date_from = params.get('date_from', datetime.now().strftime('%Y-%m-%d'))
            date_to = params.get('date_to', datetime.now().strftime('%Y-%m-%d'))
            
            if not employee_id:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'employee_id обязателен'}, ensure_ascii=False)
                }
            
            history = get_movement_history(int(employee_id), date_from, date_to, conn)
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'report_type': 'history',
                    'employee_id': employee_id,
                    'period': {'from': date_from, 'to': date_to},
                    'data': history
                }, default=str, ensure_ascii=False)
            }
        
        elif report_type == 'violations':
            date_from = params.get('date_from', (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
            date_to = params.get('date_to', datetime.now().strftime('%Y-%m-%d'))
            
            violations = get_violations_report(date_from, date_to, conn)
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'report_type': 'violations',
                    'period': {'from': date_from, 'to': date_to},
                    'data': violations
                }, default=str, ensure_ascii=False)
            }
        
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неизвестный тип отчёта'}, ensure_ascii=False)
        }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
