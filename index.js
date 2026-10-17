const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Подключение к базе данных Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Инициализация таблицы в БД
const initDb = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL
        );
    `);
};
initDb().catch(err => console.error("Database init error:", err));

// КОРРЕКТНЫЙ маршрут авторизации и регистрации
app.post('/auth', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Fill all fields!" });
    }

    try {
        // Ищем пользователя в базе данных
        const userRes = await pool.query('SELECT * FROM users WHERE username = \$1', [username]);

        if (userRes.rows.length > 0) {
            // Пользователь НАЙДЕН -> Получаем данные первой строки [0]
            const existingUser = userRes.rows[0];

            // Строго проверяем пароль
            if (existingUser.password === password) {
                return res.json({ status: "success", message: "Success login!" });
            } else {
                // Если имя занято и пароль не совпал
                return res.status(400).json({ status: "error", message: "Username is already taken!" });
            }
        } else {
            // Пользователя НЕТ -> Создаем новый уникальный аккаунт
            await pool.query('INSERT INTO users (username, password) VALUES (\$1, \$2)', [username, password]);
            return res.json({ status: "success", message: "Account created! Press Check again to login." });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: "Server database error." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
