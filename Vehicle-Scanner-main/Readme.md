FOR PROD Deployment using postgresql database
Set the database url in the .env file
The app will use the database url to connect to the database if it is set else it will use the default sqlite database

There is a default admin user with username: admin and password: admin123

this can be modified in the initial_schema.sql file in the migration folder

If you want to use your own password:

In your backend venv, run:

```python
from passlib.hash import bcrypt
print(bcrypt.hash("your-password-here"))
```

Replace the password_hash value in the INSERT with the printed hash.
After this migration:

With DATABASE_URL pointing at this Postgres DB, the app will have:
A working schema for users + vehicles.
A default admin: admin / admin123 (or whatever you chose).


Start backend with .env 

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

Start frontend with .env

npm run dev