/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.12-MariaDB, for Linux (x86_64)
--
-- Host: mysql    Database: teste25
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
('369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',NULL,'2026-05-31 23:22:57.075','2026-05-31 23:30:33.619',100.00,115.00,'closed'),
('e152f94a-35f7-47d7-9968-fdb4ed19fd25',NULL,'2026-05-31 23:31:22.056',NULL,100.00,NULL,'open');
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
('4cc2569c-d6f7-4b8a-86e4-f28bc45d8243','cerveja','2026-05-31 23:16:40.227','2026-05-31 23:16:40.227',NULL);
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
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `images` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longblob NOT NULL,
  `mimeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
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
('01cd672b-5d4b-4be6-81fe-3b9004ce0a7c','b35cab52-b608-4445-a9c6-4972683608f4','IN',9.000,2.9000,'Estorno Venda Cancelada (Venda: 3a9ea29c-a354-4d60-b557-05e26630a68d)','2026-05-31 23:30:28.558'),
('0c434b80-c232-46a7-a30d-5c0c241ca015','b35cab52-b608-4445-a9c6-4972683608f4','SALE',2.000,NULL,'Venda PDV','2026-05-31 23:24:27.642'),
('11ba9f24-448d-416c-aaa7-248934beea33','b35cab52-b608-4445-a9c6-4972683608f4','SALE',2.000,NULL,'Venda PDV','2026-05-31 23:24:16.080'),
('2bb16968-e844-42c2-a0c0-9bff17db5706','b35cab52-b608-4445-a9c6-4972683608f4','SALE',17.000,NULL,'Venda PDV','2026-05-31 23:24:22.606'),
('3311a077-dcfa-46d8-809d-8c65efb86914','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,3.1000,'Entrada de Estoque — Reposição via App','2026-05-31 23:17:24.239'),
('4d2a2316-504d-4341-9599-13af49103bf1','b35cab52-b608-4445-a9c6-4972683608f4','SALE',4.000,NULL,'Venda PDV','2026-05-31 23:31:31.613'),
('5933108e-057b-49b2-856e-1cab761cf727','b35cab52-b608-4445-a9c6-4972683608f4','IN',1.000,2.9000,'Entrada de Estoque — Reposição via App','2026-05-31 23:18:06.428'),
('63ddb67e-c08b-4cd3-bff4-cd11ae2c5b48','b35cab52-b608-4445-a9c6-4972683608f4','IN',8.000,3.1000,'Estorno Venda Cancelada (Venda: 3a9ea29c-a354-4d60-b557-05e26630a68d)','2026-05-31 23:30:28.569'),
('83066b72-ed3a-46bc-a60e-32ae2ae73e29','b35cab52-b608-4445-a9c6-4972683608f4','SALE',1.000,NULL,'Venda PDV','2026-05-31 23:24:11.728'),
('8d11d15f-eeeb-4e1c-b2dc-7b10d3fae8e6','b35cab52-b608-4445-a9c6-4972683608f4','IN',2.000,4.0000,'Entrada de Estoque — Reposição via App','2026-05-31 23:26:06.420'),
('a6eab4af-7138-4a6c-883d-19eb2ecda25c','b35cab52-b608-4445-a9c6-4972683608f4','IN',3.000,2.9000,'Estorno Venda Cancelada (Venda: 68a1910f-b932-465b-ac68-710abfdffbaf)','2026-05-31 23:24:01.077'),
('b189bde9-fc49-4016-8e40-8e3e22eff66c','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,3.1000,'Entrada de Estoque — Reposição via App','2026-05-31 23:19:23.614'),
('b27d139e-42b6-45cf-871f-73ffec1cb2a1','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,2.9000,'Entrada de Estoque — Reposição via App','2026-05-31 23:17:52.060'),
('b2e2e7d4-7b13-4145-a3b0-f8f0f1e434bb','b35cab52-b608-4445-a9c6-4972683608f4','SALE',3.000,NULL,'Venda PDV','2026-05-31 23:23:05.873'),
('c0de3fa3-54b1-49bf-8a8b-e3f43ba079a7','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,2.9100,'Entrada de Estoque — Reposição via App','2026-05-31 23:29:13.911'),
('d0950b03-bde9-4e76-bd55-2f2f31857f6a','b35cab52-b608-4445-a9c6-4972683608f4','IN',1.000,2.9000,'Entrada de Estoque — Reposição via App','2026-05-31 23:19:37.618'),
('d9e4d452-e0d4-4ea0-94c6-45fa782fa8b2','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,3.1000,'Entrada de Estoque — Reposição via App','2026-05-31 23:25:03.929'),
('fc02e475-403e-4c8a-82f6-d92b87b45290','b35cab52-b608-4445-a9c6-4972683608f4','IN',12.000,2.9000,'Estoque Inicial — Cadastro Manual','2026-05-31 23:17:01.152');
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operators`
--

LOCK TABLES `operators` WRITE;
/*!40000 ALTER TABLE `operators` DISABLE KEYS */;
INSERT INTO `operators` VALUES
('147b2fcc-9e43-40c9-b6fe-735ff2ef93ed','asd','$2b$10$Y1jyvLMbOJvFDAiIs6jyculuBwhtuztDNnM3BI/C1auVxlAZZIO.K',0,'2026-05-31 23:22:49.455','2026-05-31 23:31:48.857');
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
INSERT INTO `payments` VALUES
('0450b495-d212-42de-9a78-3919a427c744','3a9ea29c-a354-4d60-b557-05e26630a68d','03','credito',85.00,0.00),
('0814644b-07c0-4023-aae4-b5747054b559','92fef2ee-48c0-4add-b28f-905432892886','17','pix',10.00,0.00),
('2d867b85-4ac0-41ab-9ace-b05df52fda30','8aa5aec2-a22d-4bc8-9fe2-4a3b3fe4ff6a','01','dinheiro',5.00,0.00),
('857a1633-1624-4cc6-be4a-7d79380a1c9b','bd10ef0b-f202-4d44-978c-ab27564cffc7','01','dinheiro',10.00,0.00),
('af33720b-e7c0-4e2d-814f-a000f9618308','68a1910f-b932-465b-ac68-710abfdffbaf','03','credito',15.00,0.00),
('ed03b7c7-93d4-40c7-aa57-077c1f323cce','8bd408ee-17d0-49b8-a289-56dcc716cd6e','01','dinheiro',20.00,0.00);
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
  `volumeUnit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `volumeCapacity` decimal(10,3) DEFAULT NULL,
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
('b35cab52-b608-4445-a9c6-4972683608f4','4cc2569c-d6f7-4b8a-86e4-f28bc45d8243',NULL,'Cerveja Brahma Chopp 350ml','1','7891149010509','UN',1,'https://atacadaobr.vteximg.com.br/arquivos/ids/1140736/m.jpg?v=639076961227930000',2.9100,5.0000,67.000,9,'22030000',NULL,0,'2026-05-31 23:17:01.127','2026-05-31 23:31:31.589',0,NULL,NULL);
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
INSERT INTO `sale_items` VALUES
('0915899a-aba9-4a2b-902e-54d50169e7f2','8aa5aec2-a22d-4bc8-9fe2-4a3b3fe4ff6a','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',1.000,5.0000,0.00,5.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,2.9000,0,NULL),
('0f403ac2-421f-4328-aff0-983b06f69f10','bd10ef0b-f202-4d44-978c-ab27564cffc7','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',2.000,5.0000,0.00,10.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,2.9000,0,NULL),
('805eb81e-44c4-494f-8d1c-1e57739bb267','3a9ea29c-a354-4d60-b557-05e26630a68d','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',17.000,5.0000,0.00,85.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,2.9941,0,NULL),
('a96983e4-0dda-4fe8-9cfd-cf19071cbb93','8bd408ee-17d0-49b8-a289-56dcc716cd6e','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',4.000,5.0000,0.00,20.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,2.9000,0,NULL),
('c2b764ad-5b51-4458-995b-757a02f36c84','68a1910f-b932-465b-ac68-710abfdffbaf','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',3.000,5.0000,0.00,15.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,2.9000,0,NULL),
('e6188406-287a-4dab-8dbb-878de4795085','92fef2ee-48c0-4add-b28f-905432892886','b35cab52-b608-4445-a9c6-4972683608f4','Cerveja Brahma Chopp 350ml','UN',2.000,5.0000,0.00,10.00,'22030000',NULL,'5102',0,NULL,NULL,0.00,0.00,'99',0.00,0.00,'99',0.00,0.00,3.1000,0,NULL);
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
INSERT INTO `sales` VALUES
('3a9ea29c-a354-4d60-b557-05e26630a68d',NULL,NULL,'369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',85.00,0.00,85.00,'cancelled',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:24:22.580','2026-05-31 23:30:28.572','vacilou','2026-05-31 23:30:28.571'),
('68a1910f-b932-465b-ac68-710abfdffbaf',NULL,NULL,'369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',15.00,0.00,15.00,'cancelled',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:23:05.844','2026-05-31 23:24:01.081','lançamento incorreto ','2026-05-31 23:24:01.080'),
('8aa5aec2-a22d-4bc8-9fe2-4a3b3fe4ff6a',NULL,NULL,'369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',5.00,0.00,5.00,'completed',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:24:11.699','2026-05-31 23:24:11.699',NULL,NULL),
('8bd408ee-17d0-49b8-a289-56dcc716cd6e',NULL,NULL,'e152f94a-35f7-47d7-9968-fdb4ed19fd25',20.00,0.00,20.00,'completed',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:31:31.583','2026-05-31 23:31:31.583',NULL,NULL),
('92fef2ee-48c0-4add-b28f-905432892886',NULL,NULL,'369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',10.00,0.00,10.00,'completed',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:24:27.618','2026-05-31 23:24:27.618',NULL,NULL),
('bd10ef0b-f202-4d44-978c-ab27564cffc7',NULL,NULL,'369f989e-c0a3-4d55-bc4c-6ace5c31e9cc',10.00,0.00,10.00,'completed',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 23:24:16.053','2026-05-31 23:24:16.053',NULL,NULL);
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
INSERT INTO `stock_lot_consumptions` VALUES
('4379c73f-2936-4bfe-8ab1-7a633dca3ffa','805eb81e-44c4-494f-8d1c-1e57739bb267','743386e1-1fc2-4220-92f9-f632cff0c143',9.000),
('554a58b0-9444-45cb-9d3e-09bcace60c51','a96983e4-0dda-4fe8-9cfd-cf19071cbb93','743386e1-1fc2-4220-92f9-f632cff0c143',4.000),
('78168f1c-6b87-4073-bb08-789766951319','c2b764ad-5b51-4458-995b-757a02f36c84','743386e1-1fc2-4220-92f9-f632cff0c143',3.000),
('8202aee0-46cc-4d28-a386-aaef52f121b0','0915899a-aba9-4a2b-902e-54d50169e7f2','743386e1-1fc2-4220-92f9-f632cff0c143',1.000),
('b02096a7-fa9d-4156-a521-558b47596bb7','0f403ac2-421f-4328-aff0-983b06f69f10','743386e1-1fc2-4220-92f9-f632cff0c143',2.000),
('c34e2c2e-a2d1-440d-8f05-1caa507897e2','805eb81e-44c4-494f-8d1c-1e57739bb267','5564e0fa-e87a-465f-a22f-a44b26e1787d',8.000),
('cca3f919-3825-4299-936b-59ecb336ce66','e6188406-287a-4dab-8dbb-878de4795085','5564e0fa-e87a-465f-a22f-a44b26e1787d',2.000);
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
INSERT INTO `stock_lots` VALUES
('46416b3f-a8bd-4e2e-a357-445639be6093','b35cab52-b608-4445-a9c6-4972683608f4',4.0000,2.000,2.000,'2026-05-31 23:26:06.415','2026-05-31 23:26:06.415'),
('488e7f5f-a783-43bc-9f95-9b2bee2b7caa','b35cab52-b608-4445-a9c6-4972683608f4',3.1000,12.000,12.000,'2026-05-31 23:25:03.925','2026-05-31 23:25:03.925'),
('5564e0fa-e87a-465f-a22f-a44b26e1787d','b35cab52-b608-4445-a9c6-4972683608f4',3.1000,12.000,10.000,'2026-05-31 23:17:24.236','2026-05-31 23:30:28.560'),
('5e7914ce-fa35-4ef8-9621-407147c49717','b35cab52-b608-4445-a9c6-4972683608f4',2.9000,1.000,1.000,'2026-05-31 23:19:37.615','2026-05-31 23:19:37.615'),
('695ec360-e2c0-4d3d-b109-efb011495e02','b35cab52-b608-4445-a9c6-4972683608f4',2.9000,1.000,1.000,'2026-05-31 23:18:06.424','2026-05-31 23:18:06.424'),
('743386e1-1fc2-4220-92f9-f632cff0c143','b35cab52-b608-4445-a9c6-4972683608f4',2.9000,12.000,5.000,'2026-05-31 23:17:01.140','2026-05-31 23:31:31.599'),
('8c6113a4-e92f-402d-bd27-77b953d8efa9','b35cab52-b608-4445-a9c6-4972683608f4',2.9000,12.000,12.000,'2026-05-31 23:17:52.057','2026-05-31 23:17:52.057'),
('abc70c76-0d4c-4285-a11f-3126f4282a3e','b35cab52-b608-4445-a9c6-4972683608f4',3.1000,12.000,12.000,'2026-05-31 23:19:23.612','2026-05-31 23:19:23.612'),
('b11d01e7-d3b4-4d06-82fc-ef70fd561cfb','b35cab52-b608-4445-a9c6-4972683608f4',2.9100,12.000,12.000,'2026-05-31 23:29:13.907','2026-05-31 23:29:13.907');
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

-- Dump completed on 2026-06-17 21:55:08
