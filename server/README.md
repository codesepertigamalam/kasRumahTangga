# Smart Kas Ibu - Backend Server

Backend API untuk aplikasi Smart Kas Ibu menggunakan Express.js, Prisma ORM, dan TiDB/MySQL.

## 🚀 Cara Menjalankan

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup Environment

Salin file `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="secret-anda-yang-aman"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database
npm run db:push

# Atau gunakan migrations untuk production
npm run db:migrate
```

### 4. Jalankan Server

```bash
# Development (dengan hot reload)
npm run dev

# Production
npm run build
npm start
```

Server akan berjalan di `https://kasrumahtangga.vercel.app`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login (dengan opsi Remember Me)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Transactions
- `GET /api/transactions` - List semua transaksi
- `POST /api/transactions` - Tambah transaksi baru
- `PUT /api/transactions/:id` - Update transaksi
- `DELETE /api/transactions/:id` - Hapus transaksi

### Wallets
- `GET /api/wallets` - List semua wallet
- `POST /api/wallets` - Tambah wallet baru
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Hapus wallet

### Categories
- `GET /api/categories` - List semua kategori
- `POST /api/categories` - Tambah kategori baru
- `PUT /api/categories/:id` - Update kategori
- `DELETE /api/categories/:id` - Hapus kategori

### Budgets (Amplop Digital)
- `GET /api/budgets` - List semua budget dengan kalkulasi spent
- `POST /api/budgets` - Tambah budget baru
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Hapus budget

### Reminders
- `GET /api/reminders` - List semua pengingat
- `POST /api/reminders` - Tambah pengingat baru
- `PUT /api/reminders/:id` - Update pengingat
- `PUT /api/reminders/:id/mark-paid` - Tandai sudah dibayar
- `DELETE /api/reminders/:id` - Hapus pengingat

### Reports
- `GET /api/reports/monthly` - Laporan bulanan
- `GET /api/reports/trend` - Tren mingguan/bulanan
- `GET /api/reports/comparison` - Perbandingan antar bulan

## 🔐 Autentikasi

Semua endpoint (kecuali `/auth/login` dan `/auth/register`) memerlukan token JWT.

Kirim token di header:
```
Authorization: Bearer <token>
```

Atau gunakan cookie (untuk Remember Me).

## 🗄️ Database Schema

Lihat `prisma/schema.prisma` untuk detail schema database.

## 📝 Catatan

- Semua nama kategori dan wallet otomatis di-capitalize sebelum disimpan
- Saldo wallet otomatis terupdate saat transaksi dibuat/diedit/dihapus
- Budget mendukung periode weekly, monthly, dan yearly
- Reminder recurring otomatis membuat reminder baru setelah ditandai paid
