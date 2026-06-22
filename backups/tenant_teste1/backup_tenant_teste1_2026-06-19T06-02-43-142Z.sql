/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.12-MariaDB, for Linux (x86_64)
--
-- Host: mysql    Database: teste12
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `cash_movements`
--

DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_movements` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cashRegisterId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `cash_movements_createdAt_idx` (`createdAt`),
  KEY `cash_movements_cashRegisterId_fkey` (`cashRegisterId`),
  CONSTRAINT `cash_movements_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_movements`
--

LOCK TABLES `cash_movements` WRITE;
/*!40000 ALTER TABLE `cash_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_registers`
--

DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `openingTime` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closingTime` datetime(3) DEFAULT NULL,
  `openingValue` decimal(10,2) NOT NULL DEFAULT '0.00',
  `closingValue` decimal(10,2) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  PRIMARY KEY (`id`),
  KEY `cash_registers_status_idx` (`status`),
  KEY `cash_registers_operatorId_fkey` (`operatorId`),
  CONSTRAINT `cash_registers_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_registers`
--

LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` VALUES
('48095156-616d-4b36-b5ed-ecf235ebe7a6',NULL,'2026-05-20 05:10:39.346',NULL,200.00,NULL,'open');
/*!40000 ALTER TABLE `cash_registers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `grupoTributacaoId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_key` (`name`),
  KEY `categories_grupoTributacaoId_fkey` (`grupoTributacaoId`),
  CONSTRAINT `categories_grupoTributacaoId_fkey` FOREIGN KEY (`grupoTributacaoId`) REFERENCES `grupo_tributacao` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES
('ee65bb24-e421-4510-a7d4-dcbdcdb6d95a','cachaça','2026-05-20 05:08:06.316','2026-05-20 05:08:06.316',NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpfCnpj` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_phone_key` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupo_tributacao`
--

DROP TABLE IF EXISTS `grupo_tributacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupo_tributacao` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `csosn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cstIcms` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cfop` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aliqIcms` decimal(5,2) NOT NULL DEFAULT '0.00',
  `redBcIcms` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cstPis` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `aliqPis` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cstCofins` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `aliqCofins` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cstIpi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aliqIpi` decimal(5,2) NOT NULL DEFAULT '0.00',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupo_tributacao`
--

LOCK TABLES `grupo_tributacao` WRITE;
/*!40000 ALTER TABLE `grupo_tributacao` DISABLE KEYS */;
/*!40000 ALTER TABLE `grupo_tributacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_logs`
--

DROP TABLE IF EXISTS `inventory_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_logs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `costPrice` decimal(10,4) DEFAULT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `inventory_logs_productId_fkey` (`productId`),
  CONSTRAINT `inventory_logs_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_logs`
--

LOCK TABLES `inventory_logs` WRITE;
/*!40000 ALTER TABLE `inventory_logs` DISABLE KEYS */;
INSERT INTO `inventory_logs` VALUES
('2e9e575a-8f1f-4b89-bdec-3d8bb22abe21','c5629fd8-1c28-48f6-a36e-6a773f2297be','IN',15.000,NULL,'Ajuste Manual Positivo','2026-05-20 05:15:14.658'),
('6e505585-95f8-4eff-b8d0-e4b8461eb023','a9b37611-b703-4df4-95e9-b829c5b71cf0','IN',2.000,0.0000,'Cadastro e Entrada Lote Inicial','2026-05-20 05:10:01.456'),
('93794cae-d8f1-4890-a29c-e630d5c8b58d','a9b37611-b703-4df4-95e9-b829c5b71cf0','IN',4.000,NULL,'Ajuste Manual Positivo','2026-05-20 05:14:40.942');
/*!40000 ALTER TABLE `inventory_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `numeracao_nfce`
--

DROP TABLE IF EXISTS `numeracao_nfce`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `numeracao_nfce` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serie` int NOT NULL,
  `ultimo` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `numeracao_nfce_serie_key` (`serie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `numeracao_nfce`
--

LOCK TABLES `numeracao_nfce` WRITE;
/*!40000 ALTER TABLE `numeracao_nfce` DISABLE KEYS */;
/*!40000 ALTER TABLE `numeracao_nfce` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operator_consumptions`
--

DROP TABLE IF EXISTS `operator_consumptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `operator_consumptions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settled` tinyint(1) NOT NULL DEFAULT '0',
  `settledAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operator_consumptions_saleId_key` (`saleId`),
  KEY `operator_consumptions_operatorId_fkey` (`operatorId`),
  CONSTRAINT `operator_consumptions_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `operator_consumptions_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operator_consumptions`
--

LOCK TABLES `operator_consumptions` WRITE;
/*!40000 ALTER TABLE `operator_consumptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `operator_consumptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operators`
--

DROP TABLE IF EXISTS `operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `operators` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pin` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `isManager` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operators`
--

LOCK TABLES `operators` WRITE;
/*!40000 ALTER TABLE `operators` DISABLE KEYS */;
INSERT INTO `operators` VALUES
('91958749-8c1e-4633-9a03-e75c5c479892','teste','$2b$10$GG9dfBSPrAPtFz669aV.PO34SNfY.FuasbwYwg7XjKUHXy0uSe1f6',1,'2026-05-20 05:10:31.625','2026-05-20 05:10:31.625',0);
/*!40000 ALTER TABLE `operators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `packagings`
--

DROP TABLE IF EXISTS `packagings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `packagings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `multiplier` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packagings`
--

LOCK TABLES `packagings` WRITE;
/*!40000 ALTER TABLE `packagings` DISABLE KEYS */;
/*!40000 ALTER TABLE `packagings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payables`
--

DROP TABLE IF EXISTS `payables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payables` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `dueDate` datetime(3) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VARIABLE',
  `isRecurring` tinyint(1) NOT NULL DEFAULT '0',
  `category` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paidAt` datetime(3) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payables_status_dueDate_idx` (`status`,`dueDate`),
  KEY `payables_supplierId_fkey` (`supplierId`),
  CONSTRAINT `payables_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payables`
--

LOCK TABLES `payables` WRITE;
/*!40000 ALTER TABLE `payables` DISABLE KEYS */;
/*!40000 ALTER TABLE `payables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tPag` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `method` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `troco` decimal(10,2) NOT NULL DEFAULT '0.00',
  `label` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_saleId_fkey` (`saleId`),
  CONSTRAINT `payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_modifier_groups`
--

DROP TABLE IF EXISTS `product_modifier_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_modifier_groups` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minSelected` int NOT NULL DEFAULT '1',
  `maxSelected` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `product_modifier_groups_productId_fkey` (`productId`),
  CONSTRAINT `product_modifier_groups_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_modifier_groups`
--

LOCK TABLES `product_modifier_groups` WRITE;
/*!40000 ALTER TABLE `product_modifier_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_modifier_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_modifier_options`
--

DROP TABLE IF EXISTS `product_modifier_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_modifier_options` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `groupId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `componentProductId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `priceAdjustment` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `product_modifier_options_groupId_fkey` (`groupId`),
  KEY `product_modifier_options_componentProductId_fkey` (`componentProductId`),
  CONSTRAINT `product_modifier_options_componentProductId_fkey` FOREIGN KEY (`componentProductId`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `product_modifier_options_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `product_modifier_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_modifier_options`
--

LOCK TABLES `product_modifier_options` WRITE;
/*!40000 ALTER TABLE `product_modifier_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_modifier_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_payment_method_prices`
--

DROP TABLE IF EXISTS `product_payment_method_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_payment_method_prices` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentMethodId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_payment_method_prices_productId_paymentMethodId_key` (`productId`,`paymentMethodId`),
  KEY `product_payment_method_prices_paymentMethodId_fkey` (`paymentMethodId`),
  CONSTRAINT `product_payment_method_prices_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `tenant_payment_methods` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_payment_method_prices`
--

LOCK TABLES `product_payment_method_prices` WRITE;
/*!40000 ALTER TABLE `product_payment_method_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_payment_method_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grupoTributacaoId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shortCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `imageUrl` text COLLATE utf8mb4_unicode_ci,
  `priceCost` decimal(10,4) NOT NULL,
  `priceSell` decimal(10,4) NOT NULL,
  `stock` decimal(10,3) NOT NULL DEFAULT '0.000',
  `salesCount` int NOT NULL DEFAULT '0',
  `ncm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cest` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `isComposite` tinyint(1) NOT NULL DEFAULT '0',
  `volumeCapacity` decimal(10,3) DEFAULT NULL,
  `volumeUnit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_shortCode_key` (`shortCode`),
  UNIQUE KEY `products_barcode_key` (`barcode`),
  KEY `products_categoryId_fkey` (`categoryId`),
  KEY `products_grupoTributacaoId_fkey` (`grupoTributacaoId`),
  CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_grupoTributacaoId_fkey` FOREIGN KEY (`grupoTributacaoId`) REFERENCES `grupo_tributacao` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
('5dfb36ec-1b16-4fdb-a64a-deec522506ff','ee65bb24-e421-4510-a7d4-dcbdcdb6d95a',NULL,'Cachaça Velho Barreiro (garrafa de 910ml)','2','123321568121','UN',1,'/api/products/uploads/images/fb7e3839-15a5-4f07-8ffa-653fbb8ccdc3_92ec6ca7506a10a7.jpg',0.0000,0.0000,0.000,0,NULL,NULL,0,'2026-05-20 05:11:55.282','2026-05-20 05:11:55.282',0,NULL,NULL),
('a9b37611-b703-4df4-95e9-b829c5b71cf0','ee65bb24-e421-4510-a7d4-dcbdcdb6d95a',NULL,'7896050200124','1','7896050200124','UN',1,'/api/products/uploads/images/fb7e3839-15a5-4f07-8ffa-653fbb8ccdc3_c482d1a5b023e652.jpg',0.0000,15.0000,6.000,0,NULL,NULL,0,'2026-05-20 05:10:01.451','2026-05-20 05:14:40.932',0,NULL,NULL),
('c5629fd8-1c28-48f6-a36e-6a773f2297be','ee65bb24-e421-4510-a7d4-dcbdcdb6d95a',NULL,'Refrigerante Coca-Cola 2L','3','7894900011517','UN',1,'https://atacadaobr.vteximg.com.br/arquivos/ids/1139822/p.jpg?v=639076955599000000',0.0000,10.0000,15.000,0,'22021000',NULL,0,'2026-05-20 05:15:03.483','2026-05-20 05:15:14.649',0,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchaseOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unitMultiplier` int NOT NULL DEFAULT '1',
  `unitName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `expectedCost` decimal(10,4) NOT NULL,
  `realCost` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_purchaseOrderId_fkey` (`purchaseOrderId`),
  KEY `purchase_order_items_productId_fkey` (`productId`),
  CONSTRAINT `purchase_order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `totalEstimated` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalReal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `receivedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_orders_supplierId_fkey` (`supplierId`),
  CONSTRAINT `purchase_orders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_item_modifiers`
--

DROP TABLE IF EXISTS `sale_item_modifiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_item_modifiers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `componentProductId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `priceAdjustment` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_item_modifiers_saleItemId_fkey` (`saleItemId`),
  KEY `sale_item_modifiers_componentProductId_fkey` (`componentProductId`),
  CONSTRAINT `sale_item_modifiers_componentProductId_fkey` FOREIGN KEY (`componentProductId`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sale_item_modifiers_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_item_modifiers`
--

LOCK TABLES `sale_item_modifiers` WRITE;
/*!40000 ALTER TABLE `sale_item_modifiers` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_item_modifiers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `quantity` decimal(10,3) NOT NULL,
  `priceUnit` decimal(10,4) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `ncm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cest` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cfop` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem` int NOT NULL DEFAULT '0',
  `csosn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cstIcms` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aliqIcms` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valorIcms` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cstPis` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `aliqPis` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valorPis` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cstCofins` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `aliqCofins` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valorCofins` decimal(10,2) NOT NULL DEFAULT '0.00',
  `priceCost` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `settled` tinyint(1) NOT NULL DEFAULT '0',
  `settledAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_items_saleId_fkey` (`saleId`),
  KEY `sale_items_productId_fkey` (`productId`),
  CONSTRAINT `sale_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sale_items_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashRegisterId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `emitirNfce` tinyint(1) NOT NULL DEFAULT '0',
  `nfceStatus` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceNumero` int DEFAULT NULL,
  `nfceSerie` int DEFAULT NULL,
  `nfceChave` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceProtocolo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceAutorizadaEm` datetime(3) DEFAULT NULL,
  `nfceXml` longtext COLLATE utf8mb4_unicode_ci,
  `nfceQrcode` text COLLATE utf8mb4_unicode_ci,
  `nfceCodRejeicao` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceMotivoRejeicao` text COLLATE utf8mb4_unicode_ci,
  `consumidorCpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consumidorNome` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `cancelReason` text COLLATE utf8mb4_unicode_ci,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `addition` decimal(10,2) NOT NULL DEFAULT '0.00',
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pdv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_nfceChave_key` (`nfceChave`),
  KEY `sales_createdAt_idx` (`createdAt`),
  KEY `sales_customerId_fkey` (`customerId`),
  KEY `sales_operatorId_fkey` (`operatorId`),
  KEY `sales_cashRegisterId_fkey` (`cashRegisterId`),
  CONSTRAINT `sales_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_lot_consumptions`
--

DROP TABLE IF EXISTS `stock_lot_consumptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_lot_consumptions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lotId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_lot_consumptions_saleItemId_fkey` (`saleItemId`),
  KEY `stock_lot_consumptions_lotId_fkey` (`lotId`),
  CONSTRAINT `stock_lot_consumptions_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `stock_lots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_lot_consumptions_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_lot_consumptions`
--

LOCK TABLES `stock_lot_consumptions` WRITE;
/*!40000 ALTER TABLE `stock_lot_consumptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_lot_consumptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_lots`
--

DROP TABLE IF EXISTS `stock_lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_lots` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `costPrice` decimal(10,4) NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `remaining` decimal(10,3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_lots_productId_fkey` (`productId`),
  CONSTRAINT `stock_lots_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_lots`
--

LOCK TABLES `stock_lots` WRITE;
/*!40000 ALTER TABLE `stock_lots` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_products`
--

DROP TABLE IF EXISTS `supplier_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_products` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expectedCost` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_products_supplierId_productId_key` (`supplierId`,`productId`),
  KEY `supplier_products_productId_fkey` (`productId`),
  CONSTRAINT `supplier_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `supplier_products_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_products`
--

LOCK TABLES `supplier_products` WRITE;
/*!40000 ALTER TABLE `supplier_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `whatsapp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnpjCpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_payment_methods`
--

DROP TABLE IF EXISTS `tenant_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_payment_methods` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tPag` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `hasVariablePricing` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_payment_methods`
--

LOCK TABLES `tenant_payment_methods` WRITE;
/*!40000 ALTER TABLE `tenant_payment_methods` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_settings`
--

DROP TABLE IF EXISTS `tenant_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_settings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'singleton',
  `allowNegativeStock` tinyint(1) NOT NULL DEFAULT '0',
  `discountPin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_settings`
--

LOCK TABLES `tenant_settings` WRITE;
/*!40000 ALTER TABLE `tenant_settings` DISABLE KEYS */;
INSERT INTO `tenant_settings` VALUES
('singleton',0,NULL);
/*!40000 ALTER TABLE `tenant_settings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-19  6:03:15
