# 🔧 Database Connection Troubleshooting Guide

## Current Issue: Access Denied Error

```
❌ Database connection error: Access denied for user 'music_user'@'103.134.109.221' (using password: YES)
```

This means your server is trying to connect to a remote database using user `music_user` from your current IP (`103.134.109.221`), but MySQL is rejecting the connection. Fix it using one of the solutions below.

## 🚀 Quick Solutions

### Solution 1: Fix User Permissions (Most Common)

If you have MySQL root access (on the machine where MySQL runs), run these commands:

```sql
-- Grant access from your current IP (103.134.109.221)
GRANT ALL PRIVILEGES ON Music_dept.* TO 'music_user'@'103.134.109.221' IDENTIFIED BY 'your_actual_password';

-- Or grant access from any IP (less secure, but works from anywhere)
GRANT ALL PRIVILEGES ON Music_dept.* TO 'music_user'@'%' IDENTIFIED BY 'your_actual_password';

-- Required after GRANT
FLUSH PRIVILEGES;
```

Replace `your_actual_password` with the same password you have in your `.env` as `DB_PASSWORD`.

### Solution 2: Verify .env File

Check your `.env` file in `Nad_Dhyas_Backend-main/` has the correct credentials:

```env
DB_HOST=your_database_host
DB_USER=music_user
DB_PASSWORD=your_correct_password_here
DB_NAME=Music_dept
DB_PORT=3306
```

### Solution 3: Test Connection Manually

Use the diagnostic tool:
```bash
cd Nad_Dhyas_Backend-main
node test-db-connection.js
```

Or test with MySQL client:
```bash
mysql -h your_host -u music_user -p Music_dept
```

## 🔍 Common Issues & Fixes

### Issue 1: Wrong Password

**Symptoms:** `Access denied for user 'music_user'@'...' (using password: YES)`

**Solution:**
1. Verify the password in your `.env` file
2. Reset the MySQL user password if needed:
   ```sql
   ALTER USER 'music_user'@'%' IDENTIFIED BY 'new_password';
   FLUSH PRIVILEGES;
   ```
3. Update your `.env` file with the new password

### Issue 2: User Doesn't Have Access from Your IP

**Symptoms:** Access denied even with correct password

**Solution:**
1. Check current user grants:
   ```sql
   SHOW GRANTS FOR 'music_user'@'%';
   ```

2. Grant access from your server's IP:
   ```sql
   GRANT ALL PRIVILEGES ON Music_dept.* TO 'music_user'@'103.248.75.40' IDENTIFIED BY 'password';
   FLUSH PRIVILEGES;
   ```

3. Or allow from any IP (for development):
   ```sql
   GRANT ALL PRIVILEGES ON Music_dept.* TO 'music_user'@'%' IDENTIFIED BY 'password';
   FLUSH PRIVILEGES;
   ```

### Issue 3: User Doesn't Exist

**Symptoms:** Access denied, user not found

**Solution:**
Create the user first:
```sql
CREATE USER 'music_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON Music_dept.* TO 'music_user'@'%';
FLUSH PRIVILEGES;
```

### Issue 4: Database Doesn't Exist

**Symptoms:** `Unknown database 'Music_dept'`

**Solution:**
Create the database:
```sql
CREATE DATABASE Music_dept CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Issue 5: Remote Connection Not Allowed

**Symptoms:** Connection timeout or refused

**Solution:**
1. Check MySQL `bind-address` in `my.cnf` or `my.ini`:
   ```
   bind-address = 0.0.0.0  # Allow remote connections
   ```

2. Restart MySQL server:
   ```bash
   sudo systemctl restart mysql
   # or
   sudo service mysql restart
   ```

3. Check firewall rules to allow port 3306

## 🧪 Diagnostic Steps

### Step 1: Run Diagnostic Tool
```bash
cd Nad_Dhyas_Backend-main
node test-db-connection.js
```

### Step 2: Test with MySQL Client
```bash
mysql -h your_host -u music_user -p
# Enter password when prompted
```

### Step 3: Check .env File
Make sure your `.env` file exists and has all required variables:
- `DB_HOST` - Database server host
- `DB_USER` - Database username (currently: music_user)
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (should be: Music_dept)
- `DB_PORT` - Database port (usually 3306)

### Step 4: Verify Network Connectivity
```bash
# Test if you can reach the database server
ping your_database_host

# Test if port 3306 is open
telnet your_database_host 3306
# or
nc -zv your_database_host 3306
```

## 📝 Example .env Configuration

For a remote database setup:

```env
# Remote Database Configuration
DB_HOST=your_database_server_ip_or_domain
DB_USER=music_user
DB_PASSWORD=your_secure_password
DB_NAME=Music_dept
DB_PORT=3306

# Server Configuration
PORT=4003
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://naddhyas.org
```

For a local database setup:

```env
# Local Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=Music_dept
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 🔐 Security Best Practices

1. **Use Strong Passwords**: Use complex passwords for database users
2. **Limit IP Access**: Grant access only from specific IPs when possible
3. **Use SSL**: Enable SSL connections for remote databases
4. **Regular Backups**: Always backup your database
5. **Environment Variables**: Never commit `.env` files to version control

## 📞 Still Having Issues?

1. Check MySQL error logs:
   - Linux: `/var/log/mysql/error.log`
   - Windows: Check MySQL installation directory
   
2. Verify user permissions:
   ```sql
   SELECT User, Host FROM mysql.user WHERE User = 'music_user';
   ```

3. Test connection from MySQL workbench or phpMyAdmin

4. Contact your database administrator if using a managed database service
