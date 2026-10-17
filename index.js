const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Подключаем базу данных Render через переменную окружения
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Создаем таблицу пользователей в базе данных при первом запуске
const initDb = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL
        );
    `);
};
initDb().catch(err => console.error("Ошибка инициализации базы:", err));

// Маршрут для регистрации и входа (Все в одном, как мы делали в Unity)
app.post('/auth', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Заполните все поля!" });
    }

    try {
        // Проверяем, существует ли пользователь
        const userRes = await pool.query('SELECT * FROM users WHERE username = \$1', [username]);

        if (userRes.rows.length > 0) {
            // Пользователь найден -> проверяем пароль (Вход)
            if (userRes.rows[0].password === password) {
                return res.json({ status: "success", message: "Успешный вход!" });
            } else {
                return res.status(400).json({ status: "error", message: "Неверный пароль или ник занят!" });
            }
        } else {
            // Пользователя нет -> Регистрируем его
            await pool.query('INSERT INTO users (username, password) VALUES (\$1, \$2)', [username, password]);
            return res.json({ status: "success", message: "Аккаунт создан! Нажмите еще раз для входа." });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: "Ошибка сервера базы данных." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
