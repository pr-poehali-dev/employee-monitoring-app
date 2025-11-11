'''
Business: Регистрация входа/выхода сотрудников с проверкой доступа
Args: event - dict с httpMethod, body, queryStringParameters
      context - объект с request_id, function_name
Returns: HTTP response dict
'''

import json
import os
from datetime import datetime, time
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def check_access_rights(employee_id: int, conn) -> Dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, full_name, access_granted, work_start_time, work_end_time, is_active "
            "FROM employees WHERE id = %s",
            (employee_id,)
        )
        employee = cur.fetchone()
        
        if not employee:
            return {'allowed': False, 'reason': 'Сотрудник не найден'}
        
        if not employee['is_active']:
            return {'allowed': False, 'reason': 'Сотрудник деактивирован'}
        
        if not employee['access_granted']:
            return {'allowed': False, 'reason': 'Доступ запрещен'}
        
        return {'allowed': True, 'employee': dict(employee)}

def register_event(employee_id: int, event_type: str, checkpoint_id: int, deny_reason: Optional[str], conn):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO movement_log (employee_id, checkpoint_id, event_type, event_datetime, deny_reason) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id, event_datetime",
            (employee_id, checkpoint_id, event_type, datetime.now(), deny_reason)
        )
        result = cur.fetchone()
        conn.commit()
        return dict(result)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        employee_id = body_data.get('employee_id')
        event_type = body_data.get('event_type')
        checkpoint_id = body_data.get('checkpoint_id', 1)
        
        if not employee_id or not event_type:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'employee_id и event_type обязательны'}, ensure_ascii=False)
            }
        
        conn = get_db_connection()
        
        access_check = check_access_rights(employee_id, conn)
        
        if not access_check['allowed']:
            register_event(employee_id, 'denied', checkpoint_id, access_check['reason'], conn)
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': False,
                    'reason': access_check['reason']
                }, ensure_ascii=False)
            }
        
        event_record = register_event(employee_id, event_type, checkpoint_id, None, conn)
        
        employee_data = access_check['employee']
        current_time = event_record['event_datetime'].time()
        work_start = employee_data['work_start_time']
        
        is_late = False
        if event_type == 'entry' and current_time > work_start:
            is_late = True
        
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'event_id': event_record['id'],
                'employee_name': employee_data['full_name'],
                'event_datetime': event_record['event_datetime'].isoformat(),
                'is_late': is_late
            }, ensure_ascii=False)
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        employee_id = params.get('employee_id')
        
        conn = get_db_connection()
        
        if employee_id:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT ml.*, e.full_name, c.name as checkpoint_name "
                    "FROM movement_log ml "
                    "JOIN employees e ON ml.employee_id = e.id "
                    "LEFT JOIN checkpoints c ON ml.checkpoint_id = c.id "
                    "WHERE ml.employee_id = %s "
                    "ORDER BY ml.event_datetime DESC LIMIT 50",
                    (employee_id,)
                )
                logs = cur.fetchall()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(log) for log in logs], default=str, ensure_ascii=False)
                }
        else:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT e.id, e.full_name, e.position, e.phone, "
                    "CASE WHEN ml.event_type = 'entry' THEN 'active' "
                    "WHEN ml.event_type = 'exit' THEN 'offline' ELSE 'offline' END as status "
                    "FROM employees e "
                    "LEFT JOIN LATERAL ("
                    "    SELECT event_type FROM movement_log "
                    "    WHERE employee_id = e.id AND DATE(event_datetime) = CURRENT_DATE "
                    "    ORDER BY event_datetime DESC LIMIT 1"
                    ") ml ON true "
                    "WHERE e.is_active = true"
                )
                employees = cur.fetchall()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(emp) for emp in employees], ensure_ascii=False)
                }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
