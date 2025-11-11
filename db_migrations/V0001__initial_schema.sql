-- Создание таблицы сотрудников
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    access_granted BOOLEAN DEFAULT true,
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '18:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Создание таблицы точек прохода
CREATE TABLE IF NOT EXISTS checkpoints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Создание таблицы журнала перемещений
CREATE TABLE IF NOT EXISTS movement_log (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    checkpoint_id INTEGER REFERENCES checkpoints(id),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit', 'denied')),
    event_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deny_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для быстрого поиска
CREATE INDEX idx_movement_log_employee ON movement_log(employee_id);
CREATE INDEX idx_movement_log_datetime ON movement_log(event_datetime);
CREATE INDEX idx_movement_log_type ON movement_log(event_type);

-- Вставка тестовых данных
INSERT INTO employees (id, full_name, position, phone, access_granted) VALUES
(1, 'Иван Петров', 'Прораб', '+7 (999) 123-45-67', true),
(2, 'Анна Сидорова', 'Инженер', '+7 (999) 234-56-78', true),
(3, 'Михаил Козлов', 'Монтажник', '+7 (999) 345-67-89', true),
(4, 'Елена Волкова', 'Техник', '+7 (999) 456-78-90', true);

-- Вставка точек прохода
INSERT INTO checkpoints (name, location) VALUES
('Главный вход', 'КПП-1'),
('Служебный вход', 'КПП-2');