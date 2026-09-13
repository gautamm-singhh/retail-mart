-- Reference MySQL schema for the tables this API actually uses.
-- app/models/*.py + `python seed.py` will create/populate this automatically
-- via SQLAlchemy (works against SQLite by default, or MySQL if DATABASE_URL
-- is set) - you do NOT need to run this file by hand. It's here so the
-- schema can be reviewed/diffed against Retail_Mart_ERD.pdf directly.
--
-- Note: to keep API responses matching the frontend's src/types/*.ts 1:1,
-- primary keys here are the human-readable strings the UI already expects
-- (e.g. "ORD-58421") rather than the ERD's surrogate integer IDs. This is a
-- deliberate simplification of the full production ERD, not a mismatch -
-- see README.md "ID strategy".

CREATE DATABASE IF NOT EXISTS retail_mart CHARACTER SET utf8mb4;
USE retail_mart;

CREATE TABLE roles (
  role_id     INT AUTO_INCREMENT PRIMARY KEY,
  role_name   VARCHAR(50) NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id             VARCHAR(20) PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  phone          VARCHAR(20) UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role_id        INT NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE categories (
  id          VARCHAR(20) PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id           VARCHAR(20) PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  sku          VARCHAR(80) NOT NULL UNIQUE,
  category_id  VARCHAR(20) NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock        INT NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id               VARCHAR(20) PRIMARY KEY,
  customer         VARCHAR(150) NOT NULL,
  customer_email   VARCHAR(150) NOT NULL,
  date             DATE NOT NULL,
  amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'Pending',
  status           VARCHAR(20) NOT NULL DEFAULT 'Pending',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      VARCHAR(20) NOT NULL,
  product_name  VARCHAR(200) NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE order_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(20) NOT NULL,
  status      VARCHAR(20) NOT NULL,
  date        DATE NOT NULL,
  note        TEXT,
  changed_by  VARCHAR(20),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE payments (
  id          VARCHAR(20) PRIMARY KEY,
  order_id    VARCHAR(20) NOT NULL,
  customer    VARCHAR(150) NOT NULL,
  amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  method      VARCHAR(30) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
  date        DATE NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE payment_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  payment_id  VARCHAR(20) NOT NULL,
  status      VARCHAR(20) NOT NULL,
  date        DATE NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE receipts (
  id           VARCHAR(20) PRIMARY KEY,
  payment_id   VARCHAR(20) NOT NULL UNIQUE,
  receipt_no   VARCHAR(40) NOT NULL UNIQUE,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  issued_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE couriers (
  id                     VARCHAR(20) PRIMARY KEY,
  name                   VARCHAR(120) NOT NULL UNIQUE,
  code                   VARCHAR(40) NOT NULL UNIQUE,
  contact_email          VARCHAR(150),
  tracking_url_template  VARCHAR(500),
  is_active              TINYINT(1) NOT NULL DEFAULT 1,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
  id                 VARCHAR(20) PRIMARY KEY,
  order_id           VARCHAR(20) NOT NULL,
  courier_id         VARCHAR(20),
  customer           VARCHAR(150) NOT NULL,
  courier            VARCHAR(80) NOT NULL,
  tracking_number    VARCHAR(80) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'Pending',
  expected_delivery  DATE,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (courier_id) REFERENCES couriers(id)
);

CREATE TABLE shipment_status_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id  VARCHAR(20) NOT NULL,
  status       VARCHAR(30) NOT NULL,
  date         DATE NOT NULL,
  location     VARCHAR(120),
  note         TEXT,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
