/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.12-MariaDB, for Linux (x86_64)
--
-- Host: mysql    Database: 7bar
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
INSERT INTO `cash_movements` VALUES
('14e1dbc9-bfe9-4dd1-a430-862286fc60fd','3f2cb2a5-8058-4e6c-9e50-6c9585843bdf','OUT',50.00,'','2026-05-08 22:28:08.732'),
('2af99346-c484-4515-942a-e8123db870a2','8670f69b-6428-440d-8175-11caa001b454','OUT',50.00,'marmita 2 ','2026-03-25 04:42:13.264'),
('7b4eb968-08d4-42e1-8035-af51b02d6bb6','0bdf337e-5514-490e-9aea-bfa9818d7fc1','OUT',40.00,'troquei no pix conta pessoal ','2026-04-02 01:07:26.302'),
('d5c88d9c-a72f-40e0-8ab1-21059b780e1e','62393bb6-39e6-4754-a165-eee715b5eb62','OUT',10.00,'alimentação ','2026-05-07 16:38:14.784'),
('eb48b730-1b12-4e8c-840e-c1074ebf77b0','8670f69b-6428-440d-8175-11caa001b454','OUT',50.00,'marmita','2026-03-25 04:41:59.140');
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
  `openingTime` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closingTime` datetime(3) DEFAULT NULL,
  `openingValue` decimal(10,2) NOT NULL DEFAULT '0.00',
  `closingValue` decimal(10,2) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_registers_status_idx` (`status`),
  KEY `cash_registers_operatorId_idx` (`operatorId`),
  CONSTRAINT `cash_registers_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_registers`
--

LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` VALUES
('0b0b770e-d3d1-46fa-850f-b34c06b54f39','2026-03-25 04:28:04.791','2026-03-25 04:28:19.720',120.00,478.80,'closed',NULL),
('0bdf337e-5514-490e-9aea-bfa9818d7fc1','2026-04-02 00:24:55.580','2026-05-07 16:55:25.436',100.00,1032.00,'closed',NULL),
('1ec3f199-7373-469b-b2ad-a2b1076e8fea','2026-05-10 22:55:10.265','2026-05-10 23:15:52.934',200.00,231.60,'closed',NULL),
('27ca9dd6-cf13-4402-9db4-fab02bf4b295','2026-05-09 03:47:07.852','2026-05-09 03:49:55.288',200.00,322.00,'closed',NULL),
('3de17897-7085-4988-bb6f-fbc712c6e1f8','2026-05-10 22:50:21.046','2026-05-10 22:51:41.846',10.00,37.10,'closed',NULL),
('3f2cb2a5-8058-4e6c-9e50-6c9585843bdf','2026-05-08 22:25:37.511','2026-05-08 22:29:13.648',200.00,167.30,'closed',NULL),
('41311ddf-e848-4d11-aa96-bcbcf924e225','2026-03-25 04:27:56.408','2026-03-25 04:27:59.679',230.00,230.00,'closed',NULL),
('4d8a80a5-c703-44f0-a2ed-5e7f046efe6d','2026-05-06 04:25:08.283','2026-05-07 06:52:54.771',100.00,NULL,'closed',NULL),
('4eb5f090-dc9f-4002-8988-5996600b6631','2026-04-16 22:00:16.672','2026-04-30 21:44:41.584',41.00,NULL,'closed',NULL),
('4f5009d4-a283-4b77-a964-267e2e081f0c','2026-04-01 02:05:57.312','2026-04-02 00:24:50.461',100.00,NULL,'closed',NULL),
('525ba6b5-964e-4ae5-95ec-0046408208bb','2026-05-10 23:16:45.802','2026-05-10 23:19:07.166',100.00,199.00,'closed',NULL),
('571971a5-5462-4245-9c59-d0f072cd4510','2026-03-25 04:04:44.257','2026-03-25 04:10:19.542',230.00,306.00,'closed',NULL),
('57d6ab3e-78fd-4e2a-a790-a2a1db5c1cc6','2026-05-06 00:12:50.485','2026-05-06 04:25:03.288',100.00,NULL,'closed',NULL),
('5803c849-f558-415c-ade0-14b88640d7f5','2026-03-25 04:42:22.885','2026-03-25 04:57:29.577',5.00,564.10,'closed',NULL),
('59f2ce18-eee0-48b8-a174-ad4f83378cd3','2026-05-11 00:30:50.161',NULL,100.00,NULL,'open',NULL),
('62393bb6-39e6-4754-a165-eee715b5eb62','2026-05-07 06:53:02.616','2026-05-07 16:38:36.032',100.00,120.00,'closed',NULL),
('627aae15-d983-4be8-9176-0b88015dd1d5','2026-05-10 22:03:11.855','2026-05-10 22:19:59.492',100.00,360.90,'closed',NULL),
('65c59f4c-018e-4db0-a32a-55033b9c6cba','2026-05-07 19:20:46.070','2026-05-08 05:30:05.725',100.00,NULL,'closed',NULL),
('719bea0a-00b0-434b-8606-38902f90dffc','2026-03-25 04:23:34.628','2026-03-25 04:27:52.569',100.00,100.00,'closed',NULL),
('8670f69b-6428-440d-8175-11caa001b454','2026-03-25 04:28:24.143','2026-03-25 04:42:19.387',250.00,150.00,'closed',NULL),
('88697382-8743-4efa-aa44-2609eedfe498','2026-05-10 22:04:16.834','2026-05-10 22:15:05.047',100.00,336.60,'closed',NULL),
('88b1bb6d-2f3b-49da-96c0-0f8b80682329','2026-05-08 03:36:12.781','2026-05-10 22:34:33.871',100.00,1634.80,'closed',NULL),
('8904ffce-a43f-4c31-b3d2-21d47065ba23','2026-04-30 21:44:49.466','2026-05-04 22:21:18.386',100.00,NULL,'closed',NULL),
('8b5aa388-1054-489d-bda6-341bd9822b21','2026-03-25 04:10:24.496','2026-03-25 04:23:29.981',110.00,409.20,'closed',NULL),
('9cbdda97-5984-44b1-b788-1dd4fdd0cb66','2026-05-04 22:21:26.181','2026-05-07 16:55:22.901',100.00,662.20,'closed',NULL),
('a2d561cb-bb0a-4076-be99-e7dea9a197ad','2026-05-08 22:29:28.178','2026-05-09 03:47:05.519',100.00,NULL,'closed',NULL),
('b19c9ff8-17ad-4e24-b4aa-ec009c15ba21','2026-05-07 16:59:27.537','2026-05-08 03:36:08.729',10.00,NULL,'closed',NULL),
('b48d6c0a-d089-472e-9275-0eb96f7ec480','2026-05-08 22:40:37.035','2026-05-08 22:47:19.578',100.00,253.20,'closed',NULL),
('c1eaed21-7a9e-4573-ae44-52472db1346b','2026-05-08 05:30:11.100','2026-05-10 22:43:37.977',100.00,1577.90,'closed',NULL),
('cd7ce975-b34c-4c2b-84b6-4af4be097029','2026-05-07 16:38:41.244','2026-05-07 16:55:06.580',150.00,225.50,'closed',NULL),
('eb3c1a26-6b77-4483-a7b2-e221c6973a40','2026-03-25 04:57:33.996','2026-03-25 06:53:54.294',1.00,1.00,'closed',NULL),
('ec30fdbc-05a6-4440-9f1d-3a8529412587','2026-03-25 06:53:59.022','2026-03-25 07:05:36.068',10.00,457.70,'closed',NULL),
('f088860a-fae8-4998-b037-407ec9c436bf','2026-05-10 22:52:11.108','2026-05-10 22:54:46.115',200.00,223.80,'closed',NULL),
('f2545cea-b20e-421e-9271-bc55708ba787','2026-05-07 16:49:18.500','2026-05-07 16:55:09.158',100.00,100.00,'closed',NULL),
('fb10b8c6-4f5c-4975-b991-c2f69a80d144','2026-05-09 03:50:06.354','2026-05-10 22:47:10.071',100.00,2288.40,'closed',NULL),
('fec9b6e8-23a7-4fa3-8fd8-cb3a5b13c29a','2026-05-10 22:47:46.268','2026-05-10 22:49:34.689',200.00,223.30,'closed',NULL);
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
('1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6','Test Category','2026-05-06 01:19:45.208','2026-05-06 01:19:45.208',NULL),
('34d57907-3fb2-4553-9485-5afb251f9eb7','Tabacaria','2026-04-01 02:04:18.836','2026-04-01 02:04:18.836',NULL),
('4b182fd3-2f1c-4dee-90e7-059f9b86fd5c','Salgadinhos e Petiscos','2026-04-01 02:04:18.829','2026-04-01 02:04:18.829',NULL),
('5d67ff07-29b1-4c3d-a321-1ed29f7dc6e0','Conveniência','2026-04-01 02:04:18.822','2026-04-01 02:04:18.822',NULL),
('62dcfffa-cb03-4de2-b413-1d553356d379','Copão / Combos','2026-04-01 02:04:18.833','2026-04-01 02:04:18.833',NULL),
('8d18ac77-a679-495e-88cf-296781ab8993','Refrigerantes e Sucos','2026-04-01 02:04:18.827','2026-04-01 02:04:18.827',NULL),
('9a5620ce-8039-4b08-b81c-f3c19c4efc90','Cervejas','2026-04-01 02:04:18.814','2026-04-01 02:04:18.814',NULL),
('9cc1a990-55b8-499a-b7ba-1cff3985300c','Chocolates e Balas','2026-04-01 02:04:18.831','2026-04-01 02:04:18.831',NULL),
('a734d79a-7b51-4838-986e-173b36c96ba2','Energéticos','2026-04-01 02:04:18.824','2026-04-01 02:04:18.824',NULL),
('e4300fac-af83-400d-af3b-22b36efe0f52','Destilados','2026-04-01 02:04:18.819','2026-04-01 02:04:18.819',NULL);
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
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `cpfCnpj` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `grupo_tributacao` VALUES
('86f70b3c-1abe-474f-b5f1-c3d38a2d6ead','consumidor',1,'102','','5102',0.00,0.00,'99',0.00,'99',0.00,'',0.00,'2026-05-06 00:37:52.704','2026-05-06 00:37:52.704');
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
('0199f65b-21fe-444f-bdf1-91305668d062','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:38:30.758'),
('03f166e9-0615-4f28-890c-d805beb586b5','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.149'),
('04f61579-3085-4ec6-a5ac-28442f5df1f2','09e6162d-450c-424f-8459-4286aee97c70','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:42:04.381'),
('058592db-c512-4757-99d1-a8183e8187ca','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:43:07.693'),
('06a8be41-204f-4f80-b9fb-d1a57b7673ee','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:26.009'),
('0896c4a4-25b3-4d34-8cbd-e8cdb76ffcae','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:40:49.458'),
('08a49d3c-c09e-4ff7-8032-5693e89abe0c','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:45:05.040'),
('09845420-9947-4eca-aa84-0f915f9d5b1e','e598d85a-824d-4e23-806d-651938598d2e','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:35.288'),
('09a74529-eae3-4b87-ada3-83298b287a3f','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-06 00:13:23.579'),
('0b5ee281-93ee-494d-98e2-dd9a7863f48b','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:56:12.985'),
('0c2b7f12-36d9-400e-ae45-5264d50e2cc5','9ef9aafa-8e60-4ace-afc8-fcf3f3554cd0','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:53.095'),
('0c7a0f1b-51cd-4199-8d2e-102d25f332f2','990752a0-ecf0-4504-8b85-239ca385ef9e','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:27:39.287'),
('0e4064bf-e2fe-44e8-b7c0-1ce68be563ac','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 23:14:01.318'),
('1040e75e-e9fe-4b9a-91d5-42d4c6bdd762','1488c3aa-e255-4254-8941-bb039861b891','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:17:32.802'),
('11058b0c-517b-4bf5-a920-9a218d4cac0c','d4967421-6962-4fe6-97f9-74d567b76f56','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:40.596'),
('13c50a32-5d99-4572-a246-cdb93e388856','c4753a08-36d6-462c-98a3-f5ad024d009d','IN',0.500,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 20:12:10.645'),
('1447d030-10b7-41d8-8944-1417cc1aef59','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:43:08.257'),
('1552b66f-187e-4918-9cb7-d9ec4bdf3c6e','d5d2759a-f147-48d0-a55a-d8ca49f32d9a','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:35.300'),
('15f12edf-3702-4fda-a100-486a51c0b385','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:31:23.035'),
('1670bd93-0170-4b1b-92c5-a8da92cf09de','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:48:51.376'),
('17bfd14c-77b9-4d62-ab81-536781c66c0e','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:30:22.274'),
('18dd089d-4947-49bc-b53e-b5d44c153c84','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',3.000,NULL,'Venda PDV','2026-05-06 04:43:08.577'),
('19c25c77-3111-4b3f-bbc0-580f4816e7a8','f49cedae-a9e6-42f5-94c6-07b7d6432fd2','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:46:57.618'),
('19e0dac0-d773-4023-80de-f4c21cca5db9','170097e0-fbe7-46f0-9f0b-91f38b615dc5','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:30:22.242'),
('1df5af45-3e40-4333-acd5-eff9eca1f007','7fa4da07-f34c-461a-b79b-a83ce3caae67','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.181'),
('1f8ee72d-8579-4d71-95b9-76d717e33e05','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:52:18.208'),
('2257d701-885d-4b59-8fda-7d74975554f5','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.168'),
('244f8d49-a05f-43c5-9ed1-9f82d0e01aa9','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-10 23:16:58.821'),
('24a6cf01-9f2a-43a2-aeb5-7fbc2601ec2c','4f49e6c3-5b02-47c0-afdc-314f0d80fcdf','IN',99.000,0.0000,'Estoque Inicial — Cadastro Manual','2026-05-08 19:46:45.763'),
('24e4872e-d734-4479-8745-76fc7ab80780','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-08 18:19:18.482'),
('25f34bc8-92ef-49c8-901d-3b097e9f32b7','01bb5da5-2162-4b0d-a14f-629eb7f53b10','SALE',7.000,NULL,'Venda PDV','2026-05-06 04:45:50.604'),
('261e2375-a9d4-4375-b637-aea87b174a76','286eeb12-416f-4f98-86dd-36baa58689bb','IN',20.000,0.0000,'Cadastro e Entrada Lote Inicial','2026-05-08 17:14:17.985'),
('289c1768-f488-4bff-9c08-3ddbfb4f1875','4f49e6c3-5b02-47c0-afdc-314f0d80fcdf','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:35.310'),
('2b0d6489-2bab-4fb3-adcb-c81b8e9dbb13','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:17:15.500'),
('2b4fbcc4-96a1-4103-84b7-4352fdd05acc','9588cf47-7341-470f-a6be-4e5509890bf2','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:40.579'),
('2bf29323-ef7e-4d9d-bc24-613f82f1fdab','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:37:08.555'),
('2cc7cdc3-26ec-4ac3-ad80-e2c1ee19ccf6','2659cb16-0449-4fa8-be68-a9214f79d04b','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.700'),
('2d395fe8-37d8-48ee-9c01-bed8e62a0b98','873f08f1-82b1-4a11-82e5-f9d4cf5f1154','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.175'),
('2df84711-d2a2-48d9-bccb-cf596856b520','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:45.063'),
('2e7a6cd4-e464-45d3-9824-7f34f7110fb1','b85632f8-6632-4203-9974-945ebbf5b303','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:27:20.609'),
('3058d793-e6d9-49d5-8f11-6caf621e6d06','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:44:27.870'),
('34f5559d-877b-4fb9-b890-2c3d0372c07c','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:46:08.340'),
('36f3c4fa-659a-4371-95da-a7e8ec79f17b','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:33:14.293'),
('37ba92dd-d960-42b6-b6e6-e6a08771ff04','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:26:30.170'),
('38be71a8-a54a-47b5-b616-4b2600361dbf','265ef35e-184f-4dab-baa0-b7e578f44c72','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:35.295'),
('3c2032d2-9641-4622-885a-88afa46fdc94','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:33:20.986'),
('3c61060b-a41a-4875-be37-1dce6deefc04','b85632f8-6632-4203-9974-945ebbf5b303','SALE',2.000,NULL,'Venda PDV','2026-05-08 22:46:57.626'),
('3ccd0c6d-66a8-4162-93c1-f047e81b253b','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:17:39.483'),
('3f79e622-73c9-4d0d-9b8b-b0338e9ac8f4','4ce0585b-84ac-46b4-b287-771e9fed7703','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.707'),
('4172ef94-5627-4634-88be-d0abf4cb8b19','c4753a08-36d6-462c-98a3-f5ad024d009d','OUT',0.500,NULL,'Ajuste Manual (Quebra/Perda)','2026-05-08 20:14:36.548'),
('419a0a44-9fce-4631-a1f4-f46139db7ac9','ca93d417-41ba-4915-90f6-02b13334620f','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.721'),
('43e62a65-6862-4e04-a5cb-a71fba0b3320','01bb5da5-2162-4b0d-a14f-629eb7f53b10','SALE',2.000,NULL,'Venda PDV','2026-05-06 04:45:50.819'),
('48ee8a4a-792a-4881-9431-076ff30edf1c','f49cedae-a9e6-42f5-94c6-07b7d6432fd2','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:47:15.992'),
('49afccd9-5f10-4a7d-883e-0539a885b57d','118a2ede-ff60-41fa-aca1-c8f2b15aaba8','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:42:04.006'),
('49e11ab5-da37-4a22-885a-e565f8d8361d','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',2.000,NULL,'Venda PDV','2026-05-08 22:27:52.575'),
('4ec820ae-985e-4756-a4ca-6f4aa4a3d9ef','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:42:03.997'),
('50dae035-3c7a-4d42-a2f4-6eedf7eacf06','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:47:42.818'),
('522f809a-3abe-473b-ae81-bdb5b6cf5dbe','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',3.000,NULL,'Venda PDV','2026-05-08 05:21:09.187'),
('523cd08d-d33f-4732-8fb8-9a96774da730','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:50:39.741'),
('52d51c04-cc1a-4711-94a7-0731ba6b01c4','118a2ede-ff60-41fa-aca1-c8f2b15aaba8','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:03:23.906'),
('530c8318-ce83-4adb-9983-f83cd52b1f1c','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:47:14.565'),
('53c256e8-01af-4df6-906d-b2a0408d0bf9','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:47:54.726'),
('5472779e-f9de-4af7-b6b7-9443dba6f894','09e6162d-450c-424f-8459-4286aee97c70','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:35.280'),
('567e98c8-cd71-4608-b71c-8ac6e6407087','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:15.412'),
('57fc2082-09a5-4fef-8b92-b5b0887c14ec','c3714b58-3255-41c8-b970-abf9daf03b5b','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:52:18.203'),
('593737ac-6a50-4b7b-b41f-a0d37bc059a6','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-07 19:56:33.545'),
('5aab2cc4-7ba0-4fac-ac88-86b4a141a569','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:56:12.990'),
('5b175239-31b6-406d-84ac-378640f15717','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:46:15.091'),
('5b5e8328-42a0-4c55-b28e-acb2d497aa2a','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:25:55.536'),
('5d49e4e5-65b5-41b5-b246-36fbaf18e11b','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.155'),
('6059b37b-8dc2-4cdd-808e-9af1dbe2cc5c','254c3363-f012-41f8-bfae-a8eee3d1c7ac','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:32:50.230'),
('632ac1ea-883a-41b4-9c9c-cdd0c481bbde','fe4458c1-b82e-4eea-b2d1-e1165b9f3c47','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:53.086'),
('641a0ad7-539e-45b1-aa7f-bde272b12f66','0b2b0d9e-8189-4126-9fc6-49cd76139b53','IN',100.000,2.0000,'Cadastro e Entrada Lote Inicial','2026-05-06 03:17:22.674'),
('66a78a9b-48a5-41c2-b604-8ce9c9e3337d','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:33.915'),
('67ab75fe-e740-43aa-bd5a-5575abdf8ace','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:47:54.720'),
('67c66f5a-bc4b-4bf5-942e-9e11a6ba778c','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',24.000,NULL,'Venda PDV','2026-05-08 22:46:57.631'),
('6810ed78-8a2b-4c6c-9f4b-f4ea6438d6fc','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:50:31.610'),
('6bcd1457-0650-4a22-b48b-29c38fad8c0a','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:30:22.255'),
('7067aeb5-7e7d-434c-9846-54fdde22c831','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:25:55.551'),
('734e79d8-0d82-4038-bb3d-d0e187dfea1b','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:43:07.710'),
('7386077f-37a2-4106-8ac0-83e5cf315ad1','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:47:16.010'),
('75e7a54e-952d-4218-b8cb-5255fef602d6','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:15.417'),
('79c8ded6-01b3-43f8-9de3-3af34fe614a2','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:02.418'),
('7a4ef0b7-acfd-432a-b30d-ddbf800cfc2c','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:42:56.843'),
('7c05a1ff-74af-4a4a-8ea2-7b33c1e210dc','8bd14e95-a5aa-4051-9ab5-2389aee066e8','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:16.211'),
('7c2f711b-8c00-4733-b6da-cf4c141bfc5b','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:03:23.898'),
('82368a83-c26d-43a8-a782-42f9c0682071','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-10 23:16:58.815'),
('8244973f-fc6d-4b8a-9b38-1b0098b99d8f','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:02.433'),
('85fda25d-7a70-48b5-a928-91b527b48a07','c3714b58-3255-41c8-b970-abf9daf03b5b','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:47:16.001'),
('86ab14bd-8356-4821-9afb-c3f08c16b063','990752a0-ecf0-4504-8b85-239ca385ef9e','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:46:32.936'),
('8825ca91-50eb-4a7b-a3bf-c2ef678d8d8b','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:41:44.292'),
('8a474525-c85e-4597-9320-b3e9293a8cb4','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:43:07.716'),
('8a944148-2760-46b5-b102-803260e9989a','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:25:55.545'),
('8c769eb9-e2ad-4b81-b561-ce18c8fc1352','1210b33a-b250-4a7a-8df8-92cfd0de5ab3','SALE',2.000,NULL,'Venda PDV','2026-05-06 04:43:08.391'),
('8d3ed3e5-bc86-4e7f-962d-405a16b523bf','990752a0-ecf0-4504-8b85-239ca385ef9e','IN',0.100,NULL,'Ajuste Manual Positivo','2026-05-08 20:14:59.788'),
('9174989a-bc8d-4f2c-bdec-0578f9d8e67d','01bb5da5-2162-4b0d-a14f-629eb7f53b10','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:43:08.641'),
('91942168-087e-48bf-aa3c-1c4bd603883a','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:40:49.450'),
('92314113-aa37-492f-8bda-853087d55e0a','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:46:08.350'),
('94be9557-a97d-4495-816c-190a3e7f32eb','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:17:26.653'),
('968cd2a7-3f6c-4fb1-8e1e-8df56bfb0604','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:52:18.197'),
('9695a83b-a342-4b7b-9900-26236db0c336','118a2ede-ff60-41fa-aca1-c8f2b15aaba8','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:02.426'),
('9b847241-b768-4963-ab11-c1d35b6bed40','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-11 00:30:57.990'),
('a01d0d5b-6872-4a6f-b5f7-a7787390ff9d','990752a0-ecf0-4504-8b85-239ca385ef9e','IN',50.000,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 19:36:08.510'),
('a270c304-2aec-4aa4-a24b-bb95e56291b8','a1da8c5e-a99e-4fb3-be71-a7b590c1eada','IN',98.000,0.0000,'Estoque Inicial — Cadastro Manual','2026-05-08 19:47:15.600'),
('a37ad052-e491-4c8f-8ea4-61ce309de9a2','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:16:34.771'),
('a43bd135-c269-4c61-aa4a-02eb54474e7d','0b2b0d9e-8189-4126-9fc6-49cd76139b53','IN',12.000,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 18:19:55.054'),
('a4a2b278-ac4b-466c-bd5c-0c82b9953d60','4f49e6c3-5b02-47c0-afdc-314f0d80fcdf','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:26.047'),
('a6dbd37b-b342-42e7-9165-81a0272005d0','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.728'),
('a780799f-ca1d-4d86-a332-8dd1e7e6e19f','2b880eb1-795b-4460-82fb-d2957918b107','OUT',14.000,NULL,'Ajuste Manual (Quebra/Perda)','2026-05-08 18:18:54.507'),
('a80ce62d-6a10-4c99-904f-d480d5f7aa1a','9c852847-0004-4bea-82cb-c66c78a61f0b','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:16.198'),
('a913ee73-0b10-4464-a890-bf7648eb3807','848b5f2b-1743-422b-9f26-92f3051071f5','SALE',5.000,NULL,'Venda PDV','2026-05-10 22:34:26.015'),
('a966e6fe-94b2-4679-bd6e-7ab66568e8cb','09e6162d-450c-424f-8459-4286aee97c70','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:26.031'),
('ab92cc73-53b5-4baa-9697-7ffa7694d9e1','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:14.523'),
('abf143fe-78b3-4584-8772-e3b355cfc8c7','f41dd72f-f76a-4328-9089-c1dd0abebee5','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:16.178'),
('ad7df216-80de-4290-b8e7-b2c71ed7bff9','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:17:15.914'),
('aeaf0405-4298-48c3-8c4d-f7a42f4a2687','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',3.000,NULL,'Venda PDV','2026-05-06 04:43:08.513'),
('b16e7f49-7845-447a-8a17-36f02dea60c0','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:47:54.715'),
('b1919cd6-2060-4c8e-9bff-5f66df21fcd4','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:44:27.863'),
('b230de48-68e6-4a63-a2da-e4844f1f7924','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:45:05.035'),
('b3d8bda8-1792-41c7-9fa1-de470e36cfc9','5d43206c-3990-4a1a-8a83-fea700078f6d','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:40.548'),
('b5eccbb4-24cc-47f4-beee-c4e99d297dbe','990752a0-ecf0-4504-8b85-239ca385ef9e','OUT',0.100,NULL,'Ajuste Manual (Quebra/Perda)','2026-05-08 20:15:13.569'),
('b62f3ea7-688d-4d45-9db4-74ef68a03960','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:33:14.287'),
('b6766eb0-d39b-4819-9890-94fba3fe2430','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:26:15.100'),
('b8f544b4-6ad3-416a-8d1c-f8fb34c4c798','09e6162d-450c-424f-8459-4286aee97c70','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:42:03.991'),
('b98ebb46-8fd4-4787-b32d-73a7a7065e2e','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:37:08.589'),
('b99ae6ff-3664-49df-99fd-7ec930454b8e','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:21:09.834'),
('ba7a817e-cb6f-4fe0-a813-f984160cebd6','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:46:15.096'),
('bad446b7-b973-40d6-a3bb-1cb0caa7df3d','a1da8c5e-a99e-4fb3-be71-a7b590c1eada','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:26.041'),
('bad479f2-2e41-4dd0-9675-c098985e514e','035fe5c1-c2d0-42e6-989c-2f9440b00872','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:17:15.507'),
('bcf14367-5643-4566-a8fc-9e6d0b67615b','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-11 00:30:57.996'),
('bcf57252-7df6-4a74-8438-3f792e961e3d','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-06 00:13:23.587'),
('bd01efee-ecb8-48bd-8532-c89c03b8525d','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:47:39.902'),
('be222f5f-8eab-4355-8eec-256bc6f533e0','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:56:33.619'),
('c712acdd-5bbb-4a0a-a23e-8cf59b5328dc','118a2ede-ff60-41fa-aca1-c8f2b15aaba8','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:09:06.163'),
('ca160d26-c35d-478f-a52d-7b85c474cdfb','5a2f32cf-6f01-4246-b3a7-5d45ace8dd5c','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.714'),
('cb6ad028-6d1e-426f-91b9-c41891ab543b','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:02.511'),
('cf7ad797-3525-47b0-9e01-3dfe0ea9b5a4','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:14:14.148'),
('cff9f97f-64f0-49c4-98c4-fab3e3a504f6','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',12.000,NULL,'Venda PDV','2026-05-07 16:42:15.357'),
('d318b517-5aea-49ae-bc7c-1b0d050d745d','c4753a08-36d6-462c-98a3-f5ad024d009d','IN',10.000,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 18:19:57.158'),
('d3bb2c84-18f0-4d9b-b98f-11d620eab1eb','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:50:39.746'),
('d5c649c8-f70a-424d-aaed-0eba08c591b1','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:46.437'),
('d67f1cca-99a7-4af8-81a7-4c8b4cfe05f0','5f5365a9-e18f-4b0e-8bf9-aa88e704cef8','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:16.191'),
('d7442ad6-7ab4-4683-b2f8-cb9ce7b4940a','ca93d417-41ba-4915-90f6-02b13334620f','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:33.927'),
('d7491102-32c7-4d5e-b486-5c95ce462f5f','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-07 16:17:15.905'),
('d903f32d-aea2-4d1f-ac03-fda06231a891','0e4a7708-e7c9-4fe7-b832-80139dc973f9','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:14:14.141'),
('d9571382-e1f5-4671-a8d7-3462045fa0bf','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:21:09.874'),
('da01b5e4-45b8-45a6-86fe-1ca9d906a7b5','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-06 04:32:11.599'),
('daf7bcee-669e-4ff1-afe5-3130e4eff8d5','0b2b0d9e-8189-4126-9fc6-49cd76139b53','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:41:01.550'),
('dba7055c-3ee5-412e-a870-7e0f06df646c','b85632f8-6632-4203-9974-945ebbf5b303','IN',10.000,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 20:12:14.408'),
('dcb3be02-d42d-44d5-888d-2124c1ea1034','c3714b58-3255-41c8-b970-abf9daf03b5b','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:14.693'),
('dd27e875-caf2-49ce-8572-2e735151962f','4ce0585b-84ac-46b4-b287-771e9fed7703','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:33.920'),
('dd5094e8-6c84-4a47-b755-6f5edf51caed','170097e0-fbe7-46f0-9f0b-91f38b615dc5','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:26:39.671'),
('dd5f27a1-a50f-466d-86b8-429fb92fd6ed','1488c3aa-e255-4254-8941-bb039861b891','IN',100.000,1.0000,'Cadastro e Entrada Lote Inicial','2026-04-02 00:25:36.320'),
('de13fb18-f915-4d41-a732-75a49d2bfb86','7fa4da07-f34c-461a-b79b-a83ce3caae67','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:46.445'),
('dfecf557-009f-487a-a85e-150199afe507','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:38:20.206'),
('e2825796-f3b4-492b-a2e9-afc093d202d3','2659cb16-0449-4fa8-be68-a9214f79d04b','SALE',1.000,NULL,'Venda PDV','2026-05-08 05:17:32.792'),
('e4afb899-c476-46e0-8554-4e917ee73444','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:34:02.413'),
('e4c677c8-e4a9-48e1-92b0-62aaa0a768d8','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:49:02.505'),
('e60ee729-7ddc-481a-ac40-cc999ebab977','2b880eb1-795b-4460-82fb-d2957918b107','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:14:14.136'),
('e622c815-4c20-4354-84f2-98d810e2ec71','c4753a08-36d6-462c-98a3-f5ad024d009d','IN',5.000,NULL,'Entrada de Estoque — Reposição via App','2026-05-08 20:14:48.815'),
('e725562a-e48c-4b65-aad1-e52e07a445c8','54cb53bc-618d-48de-8f79-e958f1b33311','SALE',1.000,NULL,'Venda PDV','2026-05-10 23:14:01.324'),
('ea9b2cf4-1bcb-4ff2-9054-21dcfa771d5f','118a2ede-ff60-41fa-aca1-c8f2b15aaba8','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:33:20.980'),
('ebc51b2b-841f-4c11-a74e-c21c89e34355','0e7de0fc-a459-4753-9aaa-45eed7cbc51e','SALE',2.000,NULL,'Venda PDV','2026-05-07 16:41:31.229'),
('f4df8b5b-c123-4260-bbcf-73b4fa665180','2660090c-2cfc-467f-b0df-b66e5aad8498','SALE',1.000,NULL,'Venda PDV','2026-05-08 22:38:30.751'),
('f5de839b-7d75-4382-a526-96eab2099bf1','07f68100-cb6b-4976-b89f-0b54b40b7476','SALE',1.000,NULL,'Venda PDV','2026-05-08 03:36:37.379'),
('f7bdf089-4ecf-4730-988f-116407efa5a4','a7fc94f2-9263-4b4c-8628-0ba78771d697','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:56:33.626'),
('fd23a439-3d03-407d-9f51-ffc58c3e7e5e','691a30d8-326c-4ca5-9a4b-13fe02b39314','SALE',1.000,NULL,'Venda PDV','2026-05-09 03:50:40.566'),
('fdd27423-0a68-48fb-9f85-ea0de4d480f8','7cc7723e-4d45-4c5c-b37a-139a6f6a86cb','IN',20.000,0.0000,'Cadastro e Entrada Lote Inicial','2026-05-08 17:13:59.366'),
('ff211486-a500-4a86-968e-49b201eec915','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','SALE',1.000,NULL,'Venda PDV','2026-05-10 22:50:31.604');
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
INSERT INTO `numeracao_nfce` VALUES
('7b336d2b-ca1c-48d7-86db-0e7ab20b9349',1,31);
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
('106de525-5500-4396-865c-6a3ab36a0aaa','caixa','$2b$10$eKy9P4xs6MUWP2O2vu8aTuQbisg5FlV9AVgGEXe9mi7hxbSB3Q5ze',1,'2026-05-08 21:47:57.457','2026-05-08 21:47:57.457'),
('3011e90b-677e-42e7-ad61-1a35db8d7e02','teste','$2b$10$VbvjaGJYSAhXg7n6V05vouakbOQoVjjQikZZlYbNIR.bF8v4ycEOm',1,'2026-05-09 04:27:16.009','2026-05-09 04:27:16.009'),
('975e8afa-355b-44b0-a4d4-f255ac087197','caixa teste','$2b$10$b89c6wmo/zntm3HbFTMBYePo0Ls79IgnZGH.TWnq5L.2sIF/sfPLe',1,'2026-05-10 21:30:49.760','2026-05-10 21:30:49.760'),
('c3c199f3-432a-46d7-87a4-368c8a2d1801','caixa 2','$2b$10$cBiT2XjnZ3Bwq/bLVhfI8.Icigjr1gI5kvKukxjCW1MWrbt.MPTey',1,'2026-05-08 21:48:06.111','2026-05-08 21:48:06.111'),
('d2dc8563-9c56-43cf-8c5a-4737f7c5b564','jose','$2b$10$H4fKZWUudxJ1iYtGjNoaQ.1Rh0Mjo3EB56rx5csuWdVf06fMd9Vy.',1,'2026-05-08 22:28:38.591','2026-05-08 22:28:38.591');
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
  `method` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `tPag` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
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
INSERT INTO `payments` VALUES
('038652e9-48d9-4937-8207-821a0552b9b7','b2b93b72-d77f-4b12-a89c-9946b18d92a4','dinheiro',15.00,'01',0.00,NULL),
('03ef8edd-cce9-45f7-a6a9-c9d274b2eb0d','172dc460-53d6-4372-be1b-60eee3c57638','dinheiro',10.00,'01',0.00,NULL),
('03fc11c0-6ebd-48d0-90d1-7e6631c88cc5','50d6f909-c2fd-4fa9-a49c-3953a8fe2b61','dinheiro',19.80,'01',0.00,NULL),
('04264086-4632-4bd4-8bae-e0063150fdcc','0f816383-f75e-4169-9dc5-15e1ba4ecf08','credito',207.99,'03',0.00,NULL),
('05b72f23-a179-41e9-b3db-613cc2c70421','2aa345ae-9946-4640-8671-051d8fe4c091','dinheiro',25.40,'99',0.00,NULL),
('06e89cfb-0daa-4d81-b2d1-df82ed730086','e4880e1b-2222-4f2f-9114-a0b1728bca1b','debito',4.00,'99',0.00,NULL),
('09126fd9-b72a-4c7b-a433-ff99f08a3a59','cd1490b4-e9fc-4005-9045-26e2f71045bc','dinheiro',3.50,'01',0.00,NULL),
('0a00e900-469c-4d2e-9a36-a35b81ed3094','0e589777-3824-4e77-a182-908242034510','credito',3.50,'03',0.00,NULL),
('0a3bc0a6-ffe4-46aa-b579-1b6977e61431','9bf774a8-887a-4d91-abf5-f8bda4f777c3','dinheiro',1100.50,'01',0.00,NULL),
('0bfdabdc-43ec-4fe1-8e7a-e62fe1353535','20f3aced-0357-4562-90d0-43c7c240fabf','pix',14.00,'17',0.00,NULL),
('12bbb132-cd07-45e2-84f4-479f4998da83','a79c0ebf-9880-4229-86ba-75206a376e4a','credito',4.00,'03',0.00,NULL),
('182d8ea6-4f70-41b2-a940-6b47beaabf8d','c272c02a-21df-492b-b465-120ef7a4402c','dinheiro',48.00,'01',2.00,NULL),
('186d10b5-5090-441e-b43b-45e754756fa6','0e42224c-14f4-45eb-8530-5ef1d6632ce3','dinheiro',88.40,'01',0.00,NULL),
('19d622ab-4b94-49fa-8565-f0a737da0d1a','29651848-6e51-48bd-bc87-42e6c610e60c','pix',95.00,'17',0.00,NULL),
('1c51a977-5692-4001-925b-e468a0281ca5','9a2d49f9-c7ac-4e95-b04b-22a2854ff87b','debito',18.00,'04',0.00,NULL),
('1dfac02c-dfae-4373-9fd6-b4270cf069a3','54208b37-9c08-4db6-9440-ff8461a46525','credito',15.90,'03',0.00,NULL),
('25b3ac97-e06d-4b00-974f-afdbd7264f5f','2eac5b9a-bbd1-4df3-95e1-7c5f4537b3ca','debito',84.50,'04',0.00,NULL),
('33cc120b-67cf-448b-88c6-d4564149be71','b1ed3c3a-0e7d-4953-886d-f8c879b39352','dinheiro',2.00,'01',0.00,NULL),
('3823a39a-9c4a-43ff-a021-bcd779bc48a8','c28c0610-5fa3-4e6b-b436-ab2fc3f87ed7','credito',1100.50,'03',0.00,NULL),
('39050893-900b-44be-92c5-95b1bd2856eb','4f42fcf3-c794-4334-81ec-43005e772b1e','dinheiro',6.00,'01',0.00,NULL),
('3c44dc1b-3ec7-4125-86e1-5daabeff9f0f','abb117a3-ca12-4b5a-b529-a14e442068ac','dinheiro',4.50,'01',0.00,NULL),
('3df772c7-4cc9-4a26-b101-c64fd7312256','9a2d49f9-c7ac-4e95-b04b-22a2854ff87b','dinheiro',50.00,'01',0.00,NULL),
('3f4c5259-d963-415b-977e-0b7a1ff23d50','3e56d6f5-06d6-4e6c-b423-b83053205bd7','dinheiro',2.50,'01',0.00,NULL),
('4449980c-9393-494c-9d78-3b32ec19e4a0','0611dcc6-f644-4bc7-b6df-263162449b86','dinheiro',7.30,'01',0.00,NULL),
('45330340-2d00-456a-bde3-8c2d2b5833fa','eda39234-bd8f-4c87-be5d-3caf34dc72b8','credito',7.30,'03',0.00,NULL),
('45401d84-b9d6-42c4-b55a-d332af7b8e6e','a43698af-b2f3-4b85-8379-71ecab69493d','credito',600.00,'03',0.00,NULL),
('47705eff-17b6-4d9b-9df1-55c84ccb79d8','f105ebb6-ca7f-4ab0-adf2-df7a281db51d','dinheiro',2.00,'01',0.00,NULL),
('47e0e62c-cf3e-4ea3-9e17-b778bd83b229','71e3f0df-9bd8-40c4-94e9-ac4d0ee71da5','debito',97.50,'04',0.00,NULL),
('4c724a2d-be0d-4f17-ad7c-e1eabaa43dfe','7a7efde9-200e-494c-9b05-8f6db48b4ed3','dinheiro',4.80,'01',0.00,NULL),
('508684bf-e54f-40d0-a9b9-0628b49e79c0','7b43903f-73f5-4679-a50e-2fbb2d707254','dinheiro',19.80,'01',0.00,NULL),
('54424808-5425-4cf1-97db-7ff206e879d2','004f8567-4056-4fc1-a5ca-74e48f1958ed','dinheiro',7.30,'01',0.00,NULL),
('551f9fee-6476-44bf-8612-c31ecb5922bd','7b6ca071-4c2c-4a4b-814b-e419d544211a','dinheiro',11.90,'01',0.00,NULL),
('6066875d-70d6-44d7-ae4b-fa51df4ba866','0b8c6592-77c7-4b2f-97b8-3f4edda014cc','dinheiro',8.50,'01',0.00,NULL),
('62229724-21dc-49a0-bf73-90751f76ba42','a30cb1db-2889-45c9-ac45-a4a0dd7e0068','dinheiro',19.80,'01',0.00,NULL),
('63fe845f-19c1-4e31-804b-09b087287b6c','1b6cd5c9-052d-4e36-bf21-a9fdf9924975','dinheiro',7.50,'01',0.00,NULL),
('64ca820a-a60a-43fb-98f5-621d01f78508','9f658dd0-faeb-435b-b58a-a8e0942816ad','dinheiro',19.80,'01',0.00,NULL),
('650b6113-63aa-4e02-8ed0-1cae03688f69','cca86195-910d-4783-a1d0-90e2b21872bd','dinheiro',14.50,'99',0.00,NULL),
('65ba239b-3840-409e-a142-721638b07d04','f270ced3-015d-491a-b7b8-188a2c1a03f7','dinheiro',8.50,'01',0.00,NULL),
('6a2fc2b1-1a0f-438e-8258-33537284a4eb','717677f1-9592-4a81-b0ac-c7db938ba284','dinheiro',95.00,'01',0.00,NULL),
('6f83601c-d317-4562-b03b-d580713fc6a8','4c5e8301-4105-454e-be6a-804f7cf53af7','dinheiro',27.00,'01',0.00,NULL),
('758b3017-40dd-411d-9a70-69a7b26d8c49','184d4580-3cda-47ad-8558-2209514a414a','dinheiro',6.90,'01',0.00,NULL),
('77c5f894-81b8-4215-9253-ac7c9e9c6e13','085db324-a780-4f67-a5b7-c8d55b91ef16','dinheiro',7.30,'01',0.00,NULL),
('7b3b64bf-656a-4c9e-b6cf-74b826f6beac','0d2760e6-81ac-462e-9485-9ba6fbc12043','dinheiro',19.80,'01',0.00,NULL),
('7d3f8294-8f1f-43f4-b4c9-6cd2bb4b1d6a','a3bb2a52-1107-4f85-bfa1-344e650ad408','credito',135.99,'03',0.00,NULL),
('7dbe62cc-eaab-4f19-ac6a-93a0667d4a0f','c236fa5d-9a71-47cb-9d67-7ee4e2d10f2c','debito',9.60,'04',0.00,NULL),
('7f7d856b-1952-47fa-b02d-dd310a858619','3a703c2b-058b-4c39-b200-5b45cd6417d6','debito',50.00,'04',0.00,NULL),
('8339d574-d92b-4ef8-8264-36d4414d94c8','00e0a1da-9107-4399-9a98-6813bf5d62f7','dinheiro',49.90,'01',0.00,NULL),
('85e8c755-c13a-4283-941f-2616f98022a6','2259cd42-64ee-4595-af8e-5af0b140d41e','dinheiro',4.00,'99',0.00,NULL),
('88f03558-dcfa-4335-b1a9-fe4104e41309','9316179c-e775-4931-9cb8-daee94cd8f3c','dinheiro',8.50,'01',0.00,NULL),
('8d51df17-e282-4bdc-9630-22d04b279790','f8455ad3-c79b-4845-927f-17617374f489','dinheiro',23.80,'01',0.00,NULL),
('8d89d1d8-c75d-45e6-9ca0-227717dd0086','2a39f31b-3a74-440a-aa74-c68bf7ca7a62','pix',99.80,'17',0.00,NULL),
('8ea99480-f5b8-4760-81f2-58d3dede6aab','67625e1b-35a7-4fd6-8be5-d8ec60955ff4','dinheiro',4.50,'01',0.00,NULL),
('90572755-f32e-47fc-9c8f-60eb85df1029','26435219-b3d4-4f47-ac42-04e8dc76fd1d','pix',80.50,'17',0.00,NULL),
('96e6840e-90f3-401c-b5a8-b10a24117087','c91f592e-589b-4a73-a401-caf7540c21cb','credito',32.50,'03',0.00,NULL),
('98590d38-bd56-4f3e-8efc-cfde825ec70e','ff434345-f49d-40fc-ad2b-422ac308c2aa','credito',3.50,'03',0.00,NULL),
('99e00aa5-75bb-4f25-a322-af9b136ded63','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','dinheiro',115.80,'01',0.00,NULL),
('9ada46a4-b04d-4406-a9dc-e47eca065967','2c780963-8cd1-4a00-8ef9-2520cc7c18c0','pix',2.00,'17',0.00,NULL),
('9c9a1892-3dbf-47b6-bed5-6a049c849c75','0d32bbdc-8aeb-4ac4-ba5d-11d5c402eb68','dinheiro',300.00,'01',0.00,NULL),
('9d21b173-1a8e-41cf-a894-dd1190dda15b','ff92783c-cf89-4d36-8667-186914e22571','credito',17.00,'03',0.00,NULL),
('9e38ecd1-5107-4510-b7ca-66a702f1e805','96e5f3ca-de23-4ed9-8dc2-fab6a96e91e6','dinheiro',103.80,'01',0.00,NULL),
('9f46739e-eed4-45dc-b78b-c22bc508adfb','06091d96-7923-492b-9df6-fdd5121d2665','dinheiro',20.40,'01',0.00,NULL),
('a159e3e6-baeb-414c-9bdd-a95cd56c20ff','35027b98-1dce-46ae-b2e2-31f7528f234e','pix',846.00,'99',0.00,NULL),
('a1e257f6-a571-4cc6-b8f3-4c2d04d851d2','2bf83882-e459-46f7-b376-aff69bfdacdd','credito',8.50,'99',0.00,NULL),
('a1e8798c-ba9a-4d3a-b04b-c07e80f397c4','cc98d720-32c0-4a97-a30d-ade119a774d8','dinheiro',4.50,'01',0.00,NULL),
('a5110ad5-b4a6-44bd-8b44-1ffa6d18ad36','36bda116-fd21-4e4f-b2ef-526a80e9fe5d','dinheiro',2.50,'01',0.00,NULL),
('a74c611a-ae1b-4d76-854c-c7470f3040ef','082808b1-e3de-4385-b51d-953dee491299','pix',87.40,'99',0.00,NULL),
('a76efed4-d674-492d-a13f-5613ad4b8764','6dbcaad8-db3d-438d-943e-e5cb318d6f82','dinheiro',402.00,'01',0.00,NULL),
('ae4ca1ea-bc73-48df-b898-8fe96736f109','14366ac5-5b2c-4bc4-be10-db4d871d068f','dinheiro',15.00,'01',0.50,NULL),
('b053e137-76e2-4e3a-85f9-f5caf2d2abc0','9b9ae61a-f3aa-4207-ae46-17895fc06007','dinheiro',4.00,'01',6.00,NULL),
('b235160c-54b7-4d23-8b7a-f0fad35814ad','7dbe28bf-6864-4cd7-93c1-449a404c287d','pix',15.00,'17',0.00,NULL),
('b5be3b2c-1c1a-4cef-9fb9-a84c15ea8b6f','fd06366a-5461-40dd-8866-e2dc6796985e','dinheiro',263.40,'99',0.00,NULL),
('b6e18bad-4cb7-4344-910b-7f3a4b1e1ddf','38af7198-390b-44d7-b460-6a4109dd7b53','credito',233.00,'03',0.00,NULL),
('b7975330-34c3-45e2-829d-dc33b9d67b15','fbf2871f-da86-4059-b29a-ffc3b59a1ea0','dinheiro',35.70,'01',0.00,NULL),
('b7cdca11-73e8-4629-8462-81b05bc81ced','682dc350-b821-4ea7-af09-453b08870679','debito',25.70,'99',0.00,NULL),
('b81ca847-43c7-4f56-86a4-39daf12ef924','44baecf4-7142-4d76-be91-9215de3d288f','dinheiro',95.00,'01',5.00,NULL),
('b9303998-0e3c-4a01-89df-1c2cca8ef3f3','8924c514-0882-4e07-be00-3fd52e0805e6','dinheiro',99.00,'01',0.00,NULL),
('bdf8c2da-5482-4a95-a156-89abf90f6534','b6f85825-5a5a-4926-87ef-f39b3b630c0c','credito',35.70,'03',0.00,NULL),
('c05760cf-bd27-429a-92b8-b9bafa824424','550d44d3-b260-4a20-bbb0-e0d1256f6ee8','dinheiro',3.50,'01',0.00,NULL),
('c07c29f5-806d-4ef0-87ad-7ca1154d0c8d','6292863a-7510-4b2f-8cc3-f1854ceac699','dinheiro',38.30,'01',0.00,NULL),
('c0e193d6-7cf5-4858-9a7b-e92f20c325c6','9746300b-81c2-4cc0-ab15-5dccb8a5f624','dinheiro',3.50,'01',0.00,NULL),
('c15c1f9e-d888-4cc6-87b8-379beef00814','fcbd3ca9-aa20-498a-ae65-ed2cf93a0511','dinheiro',17.00,'01',0.00,NULL),
('c3ed791b-c09d-4dc7-9067-d5e9ed2cb0b7','3ee6e4b8-5994-4349-bbee-4c567ee9fa7e','dinheiro',23.30,'01',0.00,NULL),
('c564e61d-62af-44ee-b36c-0629d322c7c5','682dc350-b821-4ea7-af09-453b08870679','dinheiro',10.00,'99',0.00,NULL),
('ca5a8f41-9833-4947-a6d3-161fcbf0bd5d','3c911cf0-f5f5-4d1c-8373-35f122d0d8a0','pix',36.90,'17',0.00,NULL),
('cb31065a-4cc6-49f2-8c6f-b00c6bf197d7','4f6188f3-bdf0-48cc-baa2-882b2e776d88','dinheiro',18.50,'01',0.00,NULL),
('cd5bb058-9484-4917-9e10-a726b80b6858','b678f46c-0b9e-4bad-a2cb-f45a7e4e90f3','pix',15.00,'17',0.00,NULL),
('d15c543a-3d88-44ae-9b93-1f39bcfdabce','3b6fc790-c900-4b57-9c8b-1fe76327fa2d','dinheiro',7.50,'99',0.00,NULL),
('d1ebe394-e2c8-4180-93bb-45bffa345bc5','f8552049-ba9c-4738-b970-09d1bf060b29','dinheiro',95.00,'99',0.00,NULL),
('d25274ed-dee6-4d40-ba54-63993ee77aca','18a745e2-2062-461f-9ed6-8447978d4ce5','dinheiro',9.30,'01',0.00,NULL),
('d573c60e-ee12-4407-b8f1-4fc39111f3de','c83d46e0-8a33-4890-9152-ba88e10e187a','pix',35.70,'17',0.00,NULL),
('dcb65c8d-5e14-4072-a63d-b34df4493899','82be98d8-afcf-41a8-8a18-7e5d637290ac','credito',2100.00,'03',0.00,NULL),
('e0f58080-f848-4555-b2a5-6e1faa134d10','3a703c2b-058b-4c39-b200-5b45cd6417d6','credito',18.00,'03',0.00,NULL),
('e19c45ec-f204-412e-beea-9703c04cbb30','d757670e-5b1a-498b-8ddd-4300ca3578bf','dinheiro',254.40,'01',0.00,NULL),
('e7b94cec-dce6-4571-a55d-0b9a12264821','34ea8ce6-a995-4ae8-a3e1-2d0c06a30455','pix',11.90,'17',0.00,NULL),
('e9612f92-fde1-4700-8464-8b12436dca14','ebb22756-ba52-452b-bbf4-3d90843e892f','dinheiro',20.40,'01',0.00,NULL),
('f28a4fd9-e6e0-45c4-9ead-e614a23ccc23','740fbee4-0fe0-4e66-9106-b1eb605f6f0e','dinheiro',7.30,'01',0.00,NULL),
('fe41a55b-436f-4606-a124-1ba8b15f95c3','60bb630f-faf5-40d4-821a-108c311b6211','dinheiro',135.20,'01',14.80,NULL);
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
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priceCost` decimal(10,4) NOT NULL,
  `priceSell` decimal(10,4) NOT NULL,
  `stock` decimal(10,3) NOT NULL DEFAULT '0.000',
  `barcode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `cest` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ncm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shortCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `grupoTributacaoId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem` int NOT NULL DEFAULT '0',
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `imageUrl` text COLLATE utf8mb4_unicode_ci,
  `salesCount` int NOT NULL DEFAULT '0',
  `isComposite` tinyint(1) NOT NULL DEFAULT '0',
  `volumeCapacity` decimal(10,3) DEFAULT NULL,
  `volumeUnit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_barcode_key` (`barcode`),
  UNIQUE KEY `products_shortCode_key` (`shortCode`),
  KEY `products_grupoTributacaoId_fkey` (`grupoTributacaoId`),
  KEY `products_categoryId_fkey` (`categoryId`),
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
('01bb5da5-2162-4b0d-a14f-629eb7f53b10','notbook','8d18ac77-a679-495e-88cf-296781ab8993',10.0000,300.0000,110.000,NULL,'2026-04-01 02:04:18.840','2026-05-07 16:56:01.606','0000001','25002252','2',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('035fe5c1-c2d0-42e6-989c-2f9440b00872','Guaraná Antarctica 2L','8d18ac77-a679-495e-88cf-296781ab8993',5.5000,8.5000,62.000,NULL,'2026-04-01 02:04:18.840','2026-05-08 22:37:08.585',NULL,NULL,'3',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('07f68100-cb6b-4976-b89f-0b54b40b7476','Monster Energy 473ml','a734d79a-7b51-4838-986e-173b36c96ba2',8.5000,11.9000,13.000,NULL,'2026-04-01 02:04:18.840','2026-05-08 22:42:03.994',NULL,NULL,'4',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('09e6162d-450c-424f-8459-4286aee97c70','teste12','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,10.0000,-4.000,NULL,'2026-05-07 20:18:59.583','2026-05-09 03:49:35.277',NULL,NULL,'67',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('0b2b0d9e-8189-4126-9fc6-49cd76139b53','Bavaria','9a5620ce-8039-4b08-b81c-f3c19c4efc90',2.0000,3.5000,103.000,' 7896045506095','2026-05-06 03:17:22.666','2026-05-10 22:47:54.724','0302100','22030000','66',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('0e4a7708-e7c9-4fe7-b832-80139dc973f9','Amstel Lata 350ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',2.8000,4.0000,177.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 23:16:58.818',NULL,NULL,'5',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('0e7de0fc-a459-4753-9aaa-45eed7cbc51e','Diamante Negro 90g','9cc1a990-55b8-499a-b7ba-1cff3985300c',4.8000,7.5000,28.000,NULL,'2026-04-01 02:04:18.840','2026-05-07 16:41:31.224',NULL,NULL,'6',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('118a2ede-ff60-41fa-aca1-c8f2b15aaba8','b','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,15.0000,-5.000,NULL,'2026-05-08 19:33:14.310','2026-05-10 22:34:02.422',NULL,NULL,'76',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e','Combo: Vodka Smirnoff + Baly 2L + Gelo','62dcfffa-cb03-4de2-b413-1d553356d379',48.0000,68.0000,29.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:46.433',NULL,NULL,'7',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('1210b33a-b250-4a7a-8df8-92cfd0de5ab3','Suco Del Valle Pêssego 1L','8d18ac77-a679-495e-88cf-296781ab8993',5.0000,7.5000,35.000,NULL,'2026-04-01 02:04:18.840','2026-05-06 04:43:08.338',NULL,NULL,'8',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('1377caa8-250a-43e3-9a06-2b26722f75ad','k','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,4.0000,0.000,NULL,'2026-05-08 19:33:14.360','2026-05-08 19:33:14.360',NULL,NULL,'83',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('1488c3aa-e255-4254-8941-bb039861b891','teste','34d57907-3fb2-4553-9485-5afb251f9eb7',1.0000,2.0000,97.000,'12213','2026-04-02 00:25:36.315','2026-05-08 05:17:32.798',NULL,NULL,'1',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('170097e0-fbe7-46f0-9f0b-91f38b615dc5','Cachaça 51 965ml','e4300fac-af83-400d-af3b-22b36efe0f52',8.5000,14.0000,38.000,NULL,'2026-04-01 02:04:18.840','2026-05-08 22:26:39.668',NULL,NULL,'9',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('1de7d43e-e3bc-4af5-9c27-f4352ceff97c','teste100','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,0.0000,0.000,NULL,'2026-05-08 18:35:04.468','2026-05-08 18:35:04.468',NULL,NULL,'71',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('2181f3dd-5f2c-4712-bedc-604a5ef4cc4a','Água Mineral c/ Gás 500ml','8d18ac77-a679-495e-88cf-296781ab8993',1.0000,2.5000,72.000,NULL,'2026-04-01 02:04:18.840','2026-05-11 00:30:57.986',NULL,NULL,'10',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('254c3363-f012-41f8-bfae-a8eee3d1c7ac','Heineken Latão 473ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',5.5000,7.5000,99.000,NULL,'2026-04-01 02:04:18.840','2026-05-06 04:32:50.226',NULL,NULL,'11',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('2659cb16-0449-4fa8-be68-a9214f79d04b','Brahma Duplo Malte Latão 473ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',3.2000,4.9000,298.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:14.697',NULL,NULL,'12',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('265ef35e-184f-4dab-baa0-b7e578f44c72','Trident Hortelã','9cc1a990-55b8-499a-b7ba-1cff3985300c',1.9000,3.0000,99.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:49:35.293',NULL,NULL,'13',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('2660090c-2cfc-467f-b0df-b66e5aad8498','Amstel Latão 473ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',3.5000,4.8000,76.000,NULL,'2026-04-01 02:04:18.840','2026-05-11 00:30:57.994',NULL,NULL,'14',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('286eeb12-416f-4f98-86dd-36baa58689bb','notbook','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,0.0000,20.000,NULL,'2026-05-08 17:14:17.981','2026-05-08 17:14:17.981',NULL,NULL,'69',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('2b880eb1-795b-4460-82fb-d2957918b107','Absolut Vodka 1L','e4300fac-af83-400d-af3b-22b36efe0f52',65.0000,95.0000,-7.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 23:16:58.811',NULL,NULL,'15',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('2c0c5121-eb93-4841-92b5-677aa0921b10','Doritos Queijo Nacho 76g','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',5.5000,8.5000,35.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.940',NULL,NULL,'16',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('3235c151-aa6c-4a8f-bb4d-01fd76dbadf9','d','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,0.5500,0.000,NULL,'2026-05-08 19:33:14.319','2026-05-08 19:33:14.319',NULL,NULL,'77',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('3a34d8ee-18d8-4e1b-a3ec-5b00c8bbd8f9','Red Bull Lata 250ml','a734d79a-7b51-4838-986e-173b36c96ba2',6.9000,9.9000,80.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.944',NULL,NULL,'17',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('47cd7491-bb9c-43f3-8217-716f5fb4621c','Essência Zomo Menta','34d57907-3fb2-4553-9485-5afb251f9eb7',12.0000,18.0000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.950',NULL,NULL,'18',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('4cdfd2f3-05da-4784-a44a-4dbad3c43eba','g','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,7.5000,0.000,NULL,'2026-05-08 19:33:14.332','2026-05-08 19:33:14.332',NULL,NULL,'79',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('4ce0585b-84ac-46b4-b287-771e9fed7703','Combo: Red Label + 4 Red Bull + Gelo','62dcfffa-cb03-4de2-b413-1d553356d379',115.0000,155.0000,28.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:33.918',NULL,NULL,'19',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('4f49e6c3-5b02-47c0-afdc-314f0d80fcdf','testa 999','34d57907-3fb2-4553-9485-5afb251f9eb7',0.0000,99.9900,97.000,NULL,'2026-05-08 19:46:45.759','2026-05-09 03:49:35.308',NULL,NULL,'87',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('503edac9-5836-4d0e-9479-ad6f45db43cc','Red Bull Tropical 250ml','a734d79a-7b51-4838-986e-173b36c96ba2',6.9000,9.9000,60.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.957',NULL,NULL,'20',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('52535b71-8583-4a92-8a68-d71ebadc5b4e','Tequila Jose Cuervo 750ml','e4300fac-af83-400d-af3b-22b36efe0f52',90.0000,129.9000,15.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.961',NULL,NULL,'21',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('53280ed9-c57b-4756-a2b2-fe7bb523203d','Heineken Long Neck 330ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',4.8000,6.9000,120.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.964',NULL,NULL,'22',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('54cb53bc-618d-48de-8f79-e958f1b33311','Água Mineral s/ Gás 500ml','8d18ac77-a679-495e-88cf-296781ab8993',0.8000,2.0000,112.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 23:14:01.322',NULL,NULL,'23',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('5a2f32cf-6f01-4246-b3a7-5d45ace8dd5c','Copo Acrílico (Unidade)','5d67ff07-29b1-4c3d-a321-1ed29f7dc6e0',0.5000,1.5000,99.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:14.711',NULL,NULL,'24',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('5d43206c-3990-4a1a-8a83-fea700078f6d','Corona Long Neck 330ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',4.9000,6.9000,59.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:40.539',NULL,NULL,'25',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('5f5365a9-e18f-4b0e-8bf9-aa88e704cef8','Isqueiro Bic','34d57907-3fb2-4553-9485-5afb251f9eb7',3.5000,6.0000,79.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:49:16.182',NULL,NULL,'26',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('63d8f31b-8715-4edf-b5f6-d0db127cf699','off','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,4.0000,0.000,NULL,'2026-05-08 19:06:40.358','2026-05-08 19:35:35.859',NULL,NULL,'72',0,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('691a30d8-326c-4ca5-9a4b-13fe02b39314','cp','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,10.0000,-1.000,NULL,'2026-05-08 19:33:14.290','2026-05-09 03:50:40.553',NULL,NULL,'73',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('698e3d3b-2b81-42ba-b6db-87bf6ddc38c1','Monster Mango Loco 473ml','a734d79a-7b51-4838-986e-173b36c96ba2',8.5000,11.9000,45.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.983',NULL,NULL,'27',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('6ca1615d-a400-4391-b3cc-36b057c5dfa7','Gelo Escama 5kg','5d67ff07-29b1-4c3d-a321-1ed29f7dc6e0',6.0000,12.0000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.987',NULL,NULL,'28',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('71baeb5c-e8f0-4f67-9465-7220982fac0f','Fanta Laranja 2L','8d18ac77-a679-495e-88cf-296781ab8993',6.0000,9.0000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.990',NULL,NULL,'29',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('73719eae-ad2c-4596-88ce-2446d12cfd36','h','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,7.0000,0.000,NULL,'2026-05-08 19:33:14.339','2026-05-08 19:33:14.339',NULL,NULL,'80',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('74025543-eb27-4de7-ab04-92e89dfd87b2','Carvão 3kg','5d67ff07-29b1-4c3d-a321-1ed29f7dc6e0',8.0000,15.0000,40.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:40.994',NULL,NULL,'30',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('7cc7723e-4d45-4c5c-b37a-139a6f6a86cb','notbook','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,10.0000,20.000,NULL,'2026-05-08 17:13:59.354','2026-05-08 17:13:59.354',NULL,NULL,'68',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('7fa4da07-f34c-461a-b79b-a83ce3caae67','Cigarro Carlton Box','34d57907-3fb2-4553-9485-5afb251f9eb7',10.0000,12.5000,38.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 22:09:06.179',NULL,NULL,'31',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('80a3830f-fd1a-4d0f-986d-61f0bb391bd2','Suco Del Valle Uva 1L','8d18ac77-a679-495e-88cf-296781ab8993',5.0000,7.5000,40.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.002',NULL,NULL,'32',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('8360d676-2573-4424-bd05-e54398053dcf','Jack Daniels No. 7 1L','e4300fac-af83-400d-af3b-22b36efe0f52',110.0000,159.9000,10.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.005',NULL,NULL,'33',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('83b769b8-57b8-4925-904e-e9281374436d','Skol Lata 350ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',2.0000,3.2000,250.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.009',NULL,NULL,'34',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('848b5f2b-1743-422b-9f26-92f3051071f5','Gin Gordon\'s 750ml','e4300fac-af83-400d-af3b-22b36efe0f52',55.0000,79.9000,13.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 22:34:26.012',NULL,NULL,'35',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('84f6fe3b-e13e-47ef-833e-ca12330ebe23','j','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,5.0000,0.000,NULL,'2026-05-08 19:33:14.354','2026-05-08 19:33:14.354',NULL,NULL,'82',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('8666ab1a-d74e-4f6d-9a83-067aeb54d545','Sprite 2L','8d18ac77-a679-495e-88cf-296781ab8993',6.0000,9.0000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.016',NULL,NULL,'36',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('873f08f1-82b1-4a11-82e5-f9d4cf5f1154','Campari 900ml','e4300fac-af83-400d-af3b-22b36efe0f52',45.0000,65.0000,19.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 22:09:06.171',NULL,NULL,'37',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('8bd14e95-a5aa-4051-9ab5-2389aee066e8','Halls Cereja','9cc1a990-55b8-499a-b7ba-1cff3985300c',1.5000,2.5000,79.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:49:16.208',NULL,NULL,'38',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('8d4711a2-2b48-497e-a9a0-4283cf1e6fe9','Fusion 2L','a734d79a-7b51-4838-986e-173b36c96ba2',11.0000,16.0000,25.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.027',NULL,NULL,'39',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('903eea14-f436-4206-9789-5a0e604634c3','Ruffles Original 76g','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',5.5000,8.5000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.031',NULL,NULL,'40',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('93e48b59-8f13-48e2-acc6-4c72ef30cc39','Smirnoff Vodka 998ml','e4300fac-af83-400d-af3b-22b36efe0f52',35.0000,49.9000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.034',NULL,NULL,'41',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('9588cf47-7341-470f-a6be-4e5509890bf2','Copão: Vodka e Energético 500ml','62dcfffa-cb03-4de2-b413-1d553356d379',7.0000,15.0000,199.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:40.572',NULL,NULL,'42',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('990752a0-ecf0-4504-8b85-239ca385ef9e','a','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,1100.5000,48.000,NULL,'2026-05-08 19:33:14.304','2026-05-20 06:20:31.715',NULL,NULL,'75',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN','/api/products/uploads/images/973bf27b-4192-4c11-aff2-ab95226b93dc_a6f42ac344c0729f.jpg',0,0,NULL,NULL),
('9c4e16c9-50f7-479d-a296-1e6b0c435814','l','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,3.0000,0.000,NULL,'2026-05-08 19:33:14.366','2026-05-08 19:33:14.366',NULL,NULL,'84',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('9c852847-0004-4bea-82cb-c66c78a61f0b','Halls Menta','9cc1a990-55b8-499a-b7ba-1cff3985300c',1.5000,2.5000,79.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:49:16.195',NULL,NULL,'43',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('9ef9aafa-8e60-4ace-afc8-fcf3f3554cd0','Cheetos Queijo 75g','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',4.8000,7.5000,24.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:53.090',NULL,NULL,'44',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('a1da8c5e-a99e-4fb3-be71-a7b590c1eada','teste98','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,98.0000,97.000,NULL,'2026-05-08 19:47:15.593','2026-05-09 03:49:26.036',NULL,NULL,'88',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('a35e9f26-dc9a-4fbc-8861-f226fa620f44','Stella Artois Long Neck 330ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',5.5000,7.5000,40.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.049',NULL,NULL,'45',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('a7fc94f2-9263-4b4c-8628-0ba78771d697','Baly Tradicional 2L','a734d79a-7b51-4838-986e-173b36c96ba2',10.0000,15.0000,30.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 22:56:33.624',NULL,NULL,'46',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('b85632f8-6632-4203-9974-945ebbf5b303','Amendoim Japones Dori','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',3.5000,6.0000,47.000,NULL,'2026-04-01 02:04:18.840','2026-05-08 22:46:57.624',NULL,NULL,'47',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('be69f49d-aed6-4292-8041-0a87c31ab848','teste99','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,100.0000,0.000,NULL,'2026-05-08 18:34:37.592','2026-05-08 18:34:37.592',NULL,NULL,'70',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('c034a6cf-1965-45dc-8614-c84d8d23c3ac','Coca-Cola 2L','8d18ac77-a679-495e-88cf-296781ab8993',7.5000,11.0000,60.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.059',NULL,NULL,'48',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('c0c8eb80-f4e5-48b5-b19e-262f1019a91c','Guaraná Antarctica Lata 350ml','8d18ac77-a679-495e-88cf-296781ab8993',2.9000,4.5000,100.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.063',NULL,NULL,'49',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('c3714b58-3255-41c8-b970-abf9daf03b5b','Baly Morango/Pêssego 2L','a734d79a-7b51-4838-986e-173b36c96ba2',10.0000,15.0000,32.000,NULL,'2026-04-01 02:04:18.840','2026-05-10 22:52:18.201',NULL,NULL,'50',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('c4753a08-36d6-462c-98a3-f5ad024d009d','Brahma Chopp Lata 350ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',2.2000,3.5000,165.000,NULL,'2026-04-01 02:04:18.840','2026-05-08 20:14:48.812',NULL,NULL,'51',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('ca93d417-41ba-4915-90f6-02b13334620f','Copo Descartável 400ml (50 un)','5d67ff07-29b1-4c3d-a321-1ed29f7dc6e0',6.0000,10.0000,23.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:33.924',NULL,NULL,'52',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('cbafd6a6-b7d5-4497-b5bf-6b76949fa5bc','Salamitos 70g','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',4.5000,7.0000,15.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.077',NULL,NULL,'53',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('ce126374-c6bd-499d-bc92-dec917401110','Kit Kat ao Leite 41,5g','9cc1a990-55b8-499a-b7ba-1cff3985300c',2.8000,4.5000,60.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.080',NULL,NULL,'54',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('cffdbc97-ff72-48cd-9a52-f7a34c4d4f9a','Cigarro Marlboro Vermelho','34d57907-3fb2-4553-9485-5afb251f9eb7',10.0000,12.5000,50.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.084',NULL,NULL,'55',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('d4967421-6962-4fe6-97f9-74d567b76f56','Copão: Gin e Tropical 500ml','62dcfffa-cb03-4de2-b413-1d553356d379',9.0000,18.0000,149.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:40.591',NULL,NULL,'56',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('d5d2759a-f147-48d0-a55a-d8ca49f32d9a','Trident Melancia','9cc1a990-55b8-499a-b7ba-1cff3985300c',1.9000,3.0000,99.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:49:35.298',NULL,NULL,'57',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('d8aed5f7-a88b-4411-b3ba-ee0161a3833d','Fandangos Presunto 75g','4b182fd3-2f1c-4dee-90e7-059f9b86fd5c',4.5000,7.0000,20.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.099',NULL,NULL,'58',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('e0cc5551-6166-4cf7-90e0-2d953e80f8d2','m','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,2.0000,0.000,NULL,'2026-05-08 19:33:14.373','2026-05-08 19:33:14.373',NULL,NULL,'85',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('e0d84633-e46c-41fb-bc95-39ba34679019','Gin Tanqueray 750ml','e4300fac-af83-400d-af3b-22b36efe0f52',95.0000,139.9000,12.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.103',NULL,NULL,'59',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('e598d85a-824d-4e23-806d-651938598d2e','tp','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,20.0000,-1.000,NULL,'2026-05-08 19:33:14.297','2026-05-09 03:49:35.284',NULL,NULL,'74',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('e59da64b-ffe6-42a5-b1b6-20b83f0618f7','Laka 90g','9cc1a990-55b8-499a-b7ba-1cff3985300c',4.8000,7.5000,30.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.107',NULL,NULL,'60',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('f41dd72f-f76a-4328-9089-c1dd0abebee5','i','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,6.0000,-1.000,NULL,'2026-05-08 19:33:14.345','2026-05-09 03:49:16.176',NULL,NULL,'81',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('f49cedae-a9e6-42f5-94c6-07b7d6432fd2','Balas Variadas (Pacote)','9cc1a990-55b8-499a-b7ba-1cff3985300c',5.0000,8.0000,18.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:47:15.986',NULL,NULL,'61',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('f5d13686-487c-49ad-a0d8-2d8cae70e984','Johnnie Walker Black Label 1L','e4300fac-af83-400d-af3b-22b36efe0f52',140.0000,189.9000,8.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.114',NULL,NULL,'62',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('f8f6d55f-ed45-48f3-8da9-dcf7517c604c','f','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,0.5000,0.000,NULL,'2026-05-08 19:33:14.326','2026-05-08 19:33:14.326',NULL,NULL,'78',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('f95f3847-d2f5-45be-ab8b-468988b69685','n','1835a9a5-0ac7-48e4-b567-62f6f7b5b3e6',0.0000,1.0000,0.000,NULL,'2026-05-08 19:33:14.380','2026-05-08 19:33:14.380',NULL,NULL,'86',1,'86f70b3c-1abe-474f-b5f1-c3d38a2d6ead',0,'UN',NULL,0,0,NULL,NULL),
('fafa8d79-71e6-4759-b7a9-d21b7ac4a338','Spaten Long Neck 355ml','9a5620ce-8039-4b08-b81c-f3c19c4efc90',4.0000,5.9000,90.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.117',NULL,NULL,'63',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('fe4458c1-b82e-4eea-b2d1-e1165b9f3c47','Carvão de Narguile (Caixa)','34d57907-3fb2-4553-9485-5afb251f9eb7',16.0000,25.0000,19.000,NULL,'2026-04-01 02:04:18.840','2026-05-09 03:50:53.083',NULL,NULL,'64',1,NULL,0,'UN',NULL,0,0,NULL,NULL),
('ff183b79-2232-469e-afab-a16a0745bfa0','Johnnie Walker Red Label 1L','e4300fac-af83-400d-af3b-22b36efe0f52',80.0000,109.9000,20.000,NULL,'2026-04-01 02:04:18.840','2026-04-02 00:43:41.125',NULL,NULL,'65',1,NULL,0,'UN',NULL,0,0,NULL,NULL);
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
  `expectedCost` decimal(10,4) NOT NULL,
  `realCost` decimal(10,4) DEFAULT NULL,
  `unitMultiplier` int NOT NULL DEFAULT '1',
  `unitName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
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
  `quantity` decimal(10,3) NOT NULL,
  `priceUnit` decimal(10,4) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `aliqCofins` decimal(5,2) NOT NULL DEFAULT '0.00',
  `aliqIcms` decimal(5,2) NOT NULL DEFAULT '0.00',
  `aliqPis` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cest` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cfop` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `csosn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cstCofins` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `cstIcms` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cstPis` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '99',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ncm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem` int NOT NULL DEFAULT '0',
  `productName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `valorCofins` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valorIcms` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valorPis` decimal(10,2) NOT NULL DEFAULT '0.00',
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
('026c3bfa-7cd3-40fe-ad2c-5e04cfed1c1f','2eac5b9a-bbd1-4df3-95e1-7c5f4537b3ca','170097e0-fbe7-46f0-9f0b-91f38b615dc5',1.000,14.0000,14.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Cachaça 51 965ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('031b3aec-8493-44c2-90e3-f321637265e0','a3bb2a52-1107-4f85-bfa1-344e650ad408','4f49e6c3-5b02-47c0-afdc-314f0d80fcdf',1.000,99.9900,99.99,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'testa 999','UN',0.00,0.00,0.00,0.0000,0,NULL),
('061e2a09-6208-4e8e-ba86-41078dac3e25','67625e1b-35a7-4fd6-8be5-d8ec60955ff4','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('06390772-52b0-4475-b7b9-56129382a1e5','f270ced3-015d-491a-b7b8-188a2c1a03f7','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('07050cf3-a16d-40f1-8940-4ada97f6f22c','50d6f909-c2fd-4fa9-a49c-3953a8fe2b61','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('07b149f1-9b61-4bb0-9511-23c6361150bf','f8455ad3-c79b-4845-927f-17617374f489','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('08e20ee8-1beb-4728-ab2a-523e8f9282cb','34ea8ce6-a995-4ae8-a3e1-2d0c06a30455','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('0962efd8-4d48-4d21-a654-0fa686242816','ebb22756-ba52-452b-bbf4-3d90843e892f','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('0b9b22ef-f996-487b-b043-68a1747af907','54208b37-9c08-4db6-9440-ff8461a46525','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('0c4ae888-e677-4d04-a62e-1ebebf4ee069','2aa345ae-9946-4640-8671-051d8fe4c091','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('0d075e15-ee07-43e6-8429-61f911e21ae7','c83d46e0-8a33-4890-9152-ba88e10e187a','07f68100-cb6b-4976-b89f-0b54b40b7476',3.000,11.9000,35.70,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('0dffb5eb-3001-4bb2-9f7d-4c25d02ec07e','d757670e-5b1a-498b-8ddd-4300ca3578bf','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('12a2e737-1b67-4f07-b8b5-f1989521d5f9','3b6fc790-c900-4b57-9c8b-1fe76327fa2d','1210b33a-b250-4a7a-8df8-92cfd0de5ab3',1.000,7.5000,7.50,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('19d82f72-8cc9-4417-bb43-1fa7122d0da5','0d2760e6-81ac-462e-9485-9ba6fbc12043','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('1ac8ad5d-ec0f-4594-9185-c43b51928247','abb117a3-ca12-4b5a-b529-a14e442068ac','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('1b82d50e-d252-423f-9465-cf666d408a37','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','873f08f1-82b1-4a11-82e5-f9d4cf5f1154',1.000,65.0000,65.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Campari 900ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('1bd8814f-c1a0-47c7-9abe-080401322e30','3e56d6f5-06d6-4e6c-b423-b83053205bd7','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('1c367276-83ca-4acf-9c1d-ee56f49266a0','cca86195-910d-4783-a1d0-90e2b21872bd','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('1f296f6a-028a-4e2b-ab51-09cb517cc8ac','0e42224c-14f4-45eb-8530-5ef1d6632ce3','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('20470c60-279a-4669-8316-f5cb28f0f66a','172dc460-53d6-4372-be1b-60eee3c57638','09e6162d-450c-424f-8459-4286aee97c70',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'teste12','UN',0.00,0.00,0.00,0.0000,0,NULL),
('21ff6f51-0013-46fd-ab12-0a047af7373a','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('242be088-975a-424c-928f-8af0871ecde2','0f816383-f75e-4169-9dc5-15e1ba4ecf08','09e6162d-450c-424f-8459-4286aee97c70',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'teste12','UN',0.00,0.00,0.00,0.0000,0,NULL),
('25652893-6033-4c66-8537-91bbcc130f77','4f6188f3-bdf0-48cc-baa2-882b2e776d88','118a2ede-ff60-41fa-aca1-c8f2b15aaba8',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'b','UN',0.00,0.00,0.00,0.0000,0,NULL),
('27d39288-90e0-4b1a-84a1-24ebbc2f78bb','fd06366a-5461-40dd-8866-e2dc6796985e','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('290d5afe-f26d-43a7-a731-1bd973b2cc9c','38af7198-390b-44d7-b460-6a4109dd7b53','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('2adc2a03-caa1-43d8-8470-7df7fb55cdd6','ff92783c-cf89-4d36-8667-186914e22571','9c852847-0004-4bea-82cb-c66c78a61f0b',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Halls Menta','UN',0.00,0.00,0.00,0.0000,0,NULL),
('2c6962aa-1435-4495-af42-30daa650febb','00e0a1da-9107-4399-9a98-6813bf5d62f7','9588cf47-7341-470f-a6be-4e5509890bf2',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Copão: Vodka e Energético 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('2dec8cc4-c15d-4211-a0a1-e9f9b1e12868','e4880e1b-2222-4f2f-9114-a0b1728bca1b','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('2ffb81d5-9f7f-4b69-9ff6-cb837bff4d60','a3bb2a52-1107-4f85-bfa1-344e650ad408','265ef35e-184f-4dab-baa0-b7e578f44c72',1.000,3.0000,3.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Trident Hortelã','UN',0.00,0.00,0.00,0.0000,0,NULL),
('300c29de-f133-484d-aa80-8ef94990804b','082808b1-e3de-4385-b51d-953dee491299','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('30f4fece-3aef-4485-9f4b-579128ca0520','4c5e8301-4105-454e-be6a-804f7cf53af7','f49cedae-a9e6-42f5-94c6-07b7d6432fd2',1.000,8.0000,8.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Balas Variadas (Pacote)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('31d33676-cfd3-44da-9514-e5c671bd940f','9b9ae61a-f3aa-4207-ae46-17895fc06007','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('325d04fa-bb9b-4d3a-ad6f-d72a056be1a2','20f3aced-0357-4562-90d0-43c7c240fabf','170097e0-fbe7-46f0-9f0b-91f38b615dc5',1.000,14.0000,14.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Cachaça 51 965ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('32c0138b-4f40-44bc-ac99-19e1f88df913','082808b1-e3de-4385-b51d-953dee491299','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('33ab4f3e-b588-4514-9536-c913fd55df59','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('33cc1baf-5040-4da9-b834-a7f2e614b55b','ff434345-f49d-40fc-ad2b-422ac308c2aa','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3670ae7a-7fc0-48fd-b75c-1138e3005edb','d757670e-5b1a-498b-8ddd-4300ca3578bf','c3714b58-3255-41c8-b970-abf9daf03b5b',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Morango/Pêssego 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3688ebbd-4034-4709-9d4a-36a2ac076d0d','0f816383-f75e-4169-9dc5-15e1ba4ecf08','4f49e6c3-5b02-47c0-afdc-314f0d80fcdf',1.000,99.9900,99.99,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'testa 999','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3d0fde37-36b2-4d9f-b241-f031cf8e56a7','2a39f31b-3a74-440a-aa74-c68bf7ca7a62','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3da931be-8f65-457c-aea9-15164225ae12','9746300b-81c2-4cc0-ab15-5dccb8a5f624','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3e7721dd-895f-4d13-bfc3-e2599987a836','c28c0610-5fa3-4e6b-b436-ab2fc3f87ed7','990752a0-ecf0-4504-8b85-239ca385ef9e',1.000,1100.5000,1100.50,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'a','UN',0.00,0.00,0.00,0.0000,0,NULL),
('3f9a606d-66d0-4d1d-be68-a904b5f12e3b','3c911cf0-f5f5-4d1c-8373-35f122d0d8a0','09e6162d-450c-424f-8459-4286aee97c70',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'teste12','UN',0.00,0.00,0.00,0.0000,0,NULL),
('403dd322-1096-4d55-8480-7f6986d1e902','0611dcc6-f644-4bc7-b6df-263162449b86','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4115993e-29ef-455e-9128-df0df4f560cc','1b6cd5c9-052d-4e36-bf21-a9fdf9924975','254c3363-f012-41f8-bfae-a8eee3d1c7ac',1.000,7.5000,7.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Heineken Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('451384f2-c77f-469f-a343-3967d2e462a0','c91f592e-589b-4a73-a401-caf7540c21cb','fe4458c1-b82e-4eea-b2d1-e1165b9f3c47',1.000,25.0000,25.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Carvão de Narguile (Caixa)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('45d97569-7d1a-41d7-9f71-3ea98b7313b3','740fbee4-0fe0-4e66-9106-b1eb605f6f0e','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('45f884da-ce47-4d1b-ab03-c16143584d79','0d2760e6-81ac-462e-9485-9ba6fbc12043','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('461f4c58-9686-4fde-91ce-a51f51bf1fbb','18a745e2-2062-461f-9ed6-8447978d4ce5','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('47c17ef6-fa1e-47b6-b4b4-f628c3c8d5b4','a79c0ebf-9880-4229-86ba-75206a376e4a','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4855a0d0-89b2-4c48-939b-1d63c88da540','a30cb1db-2889-45c9-ac45-a4a0dd7e0068','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('48bf6ba8-c6c0-431a-8d1a-b6b5455c1234','2eac5b9a-bbd1-4df3-95e1-7c5f4537b3ca','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4a6478b2-f226-48bb-aaac-b336522fd93f','8924c514-0882-4e07-be00-3fd52e0805e6','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4c54f395-3176-4ef5-a3bf-33fdf4c5338c','4f6188f3-bdf0-48cc-baa2-882b2e776d88','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4d7e1730-42d3-406f-8081-c9de12dd8912','004f8567-4056-4fc1-a5ca-74e48f1958ed','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4dd3fd51-26fb-4e48-a7fd-d501b59c711c','60bb630f-faf5-40d4-821a-108c311b6211','f49cedae-a9e6-42f5-94c6-07b7d6432fd2',1.000,8.0000,8.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Balas Variadas (Pacote)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('4e0ceec0-89fa-4ffd-9b2d-14e89c5743c7','a3bb2a52-1107-4f85-bfa1-344e650ad408','e598d85a-824d-4e23-806d-651938598d2e',1.000,20.0000,20.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'tp','UN',0.00,0.00,0.00,0.0000,0,NULL),
('504ae805-90c5-42b4-b96e-6a3aa60c201f','14366ac5-5b2c-4bc4-be10-db4d871d068f','0e7de0fc-a459-4753-9aaa-45eed7cbc51e',2.000,7.5000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Diamante Negro 90g','UN',0.00,0.00,0.00,0.0000,0,NULL),
('54eb3c18-14bb-4da8-8442-22544020f032','ff92783c-cf89-4d36-8667-186914e22571','8bd14e95-a5aa-4051-9ab5-2389aee066e8',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Halls Cereja','UN',0.00,0.00,0.00,0.0000,0,NULL),
('5c77ad05-ff64-429d-9838-72e1dd465e29','cd1490b4-e9fc-4005-9045-26e2f71045bc','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('5d834d41-44fd-4b93-8c0f-8138e88f68dc','ebb22756-ba52-452b-bbf4-3d90843e892f','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('5df7a9ae-455e-4350-87be-fa470e38e3bc','36bda116-fd21-4e4f-b2ef-526a80e9fe5d','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('5df829b0-dce2-48fc-bf61-e2ad97e6f4da','6292863a-7510-4b2f-8cc3-f1854ceac699','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('5ecb15a5-c5c1-43f4-9e1d-66f3d3a7f777','0b8c6592-77c7-4b2f-97b8-3f4edda014cc','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('60fa5941-cdb1-4428-90cf-7a635f40cd34','38af7198-390b-44d7-b460-6a4109dd7b53','ca93d417-41ba-4915-90f6-02b13334620f',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Copo Descartável 400ml (50 un)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('61748c2e-1ac1-41f9-9b4d-759b371d022a','71e3f0df-9bd8-40c4-94e9-ac4d0ee71da5','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('67f56c6e-c2c3-4e23-ad21-d89cc1ad7f8e','fcbd3ca9-aa20-498a-ae65-ed2cf93a0511','118a2ede-ff60-41fa-aca1-c8f2b15aaba8',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'b','UN',0.00,0.00,0.00,0.0000,0,NULL),
('6c3b14fa-771e-4804-9366-7ad2fff8fbb5','f8455ad3-c79b-4845-927f-17617374f489','c3714b58-3255-41c8-b970-abf9daf03b5b',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Morango/Pêssego 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('6cfa5449-1b62-4b7f-83d0-246e75cfcac7','67625e1b-35a7-4fd6-8be5-d8ec60955ff4','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('6fc7abcd-10bc-4313-bbbb-b6120c31b35c','0e589777-3824-4e77-a182-908242034510','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('70a683d1-b72b-4f1c-a807-cfadc81928e9','50d6f909-c2fd-4fa9-a49c-3953a8fe2b61','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('70b6bbef-0865-4e07-8970-24b9effbf3c8','ff92783c-cf89-4d36-8667-186914e22571','5f5365a9-e18f-4b0e-8bf9-aa88e704cef8',1.000,6.0000,6.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Isqueiro Bic','UN',0.00,0.00,0.00,0.0000,0,NULL),
('73485c7d-8909-4faf-bc05-0a3a7ba45f86','6292863a-7510-4b2f-8cc3-f1854ceac699','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('754dfd8d-20eb-4be2-894c-901a062711fc','b1ed3c3a-0e7d-4953-886d-f8c879b39352','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7551a95d-fce9-4592-a59c-c2182f0068f9','9a2d49f9-c7ac-4e95-b04b-22a2854ff87b','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('762e3a8f-98b6-43f6-893d-e6ba994a4433','38af7198-390b-44d7-b460-6a4109dd7b53','4ce0585b-84ac-46b4-b287-771e9fed7703',1.000,155.0000,155.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Red Label + 4 Red Bull + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('76f7b439-e33b-474a-be4d-4c2d3227e73c','fd06366a-5461-40dd-8866-e2dc6796985e','07f68100-cb6b-4976-b89f-0b54b40b7476',16.000,11.9000,190.40,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('78078116-d470-4114-a6be-d2984b366f4e','2bf83882-e459-46f7-b376-aff69bfdacdd','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7b06f313-f0e8-428e-8468-5000598202da','a43698af-b2f3-4b85-8379-71ecab69493d','01bb5da5-2162-4b0d-a14f-629eb7f53b10',2.000,300.0000,600.00,0.00,0.00,0.00,'0000001','5102','102','99','','99',0.00,'25002252',0,'notbook','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7c1da126-c2c7-4dcb-a932-b313df250b4a','3c911cf0-f5f5-4d1c-8373-35f122d0d8a0','118a2ede-ff60-41fa-aca1-c8f2b15aaba8',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'b','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7c94b3e0-bfc6-48a3-bab2-d6f45e784c1d','2eac5b9a-bbd1-4df3-95e1-7c5f4537b3ca','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7d9aeffd-7f73-487f-a6a4-ddb956ec81e8','8924c514-0882-4e07-be00-3fd52e0805e6','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('7e35967f-e56a-47a5-83b3-22bfde696fc6','cca86195-910d-4783-a1d0-90e2b21872bd','1488c3aa-e255-4254-8941-bb039861b891',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('831b2a73-f7d5-4a76-9fb2-50bd224da975','682dc350-b821-4ea7-af09-453b08870679','07f68100-cb6b-4976-b89f-0b54b40b7476',3.000,11.9000,35.70,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('83b8f9e9-4513-4e42-b31f-4c33131e953d','6dbcaad8-db3d-438d-943e-e5cb318d6f82','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('84b0a21b-c49c-47f8-81f6-c946f518c5dc','60bb630f-faf5-40d4-821a-108c311b6211','2660090c-2cfc-467f-b0df-b66e5aad8498',24.000,4.8000,115.20,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('84b6a423-c77b-400d-a78d-4849ee9655cc','f8455ad3-c79b-4845-927f-17617374f489','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('854ce5e4-5573-47c2-ba0f-93e28d5fef65','cca86195-910d-4783-a1d0-90e2b21872bd','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('85569072-b2cc-45cf-8fea-219277611767','a3bb2a52-1107-4f85-bfa1-344e650ad408','09e6162d-450c-424f-8459-4286aee97c70',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'teste12','UN',0.00,0.00,0.00,0.0000,0,NULL),
('85ef34dd-23bd-4aa9-9201-27cef1188f2b','6292863a-7510-4b2f-8cc3-f1854ceac699','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('876500d7-d20c-4d9c-8043-0ec44b6b93c8','9f658dd0-faeb-435b-b58a-a8e0942816ad','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8789962c-3786-4410-8fe7-8a0bbec4d495','eda39234-bd8f-4c87-be5d-3caf34dc72b8','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('88f14d11-b759-4824-8296-6137bd651699','44baecf4-7142-4d76-be91-9215de3d288f','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8a187001-9d70-4998-b3c0-07237626e052','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','118a2ede-ff60-41fa-aca1-c8f2b15aaba8',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'b','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8a4b67ae-0698-410a-885d-102d956f7e1a','d757670e-5b1a-498b-8ddd-4300ca3578bf','2659cb16-0449-4fa8-be68-a9214f79d04b',1.000,4.9000,4.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Brahma Duplo Malte Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8c63e483-2b96-4cb2-b10a-7dcae99790d3','740fbee4-0fe0-4e66-9106-b1eb605f6f0e','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8cc91716-fb09-4f89-b170-0aa9ce7abdb7','004f8567-4056-4fc1-a5ca-74e48f1958ed','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('8ec2c256-eb0a-47dd-8cdd-b8bb8b577fb9','18a745e2-2062-461f-9ed6-8447978d4ce5','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('91a98eaf-49b5-48a0-a3ba-93184f70716b','7a7efde9-200e-494c-9b05-8f6db48b4ed3','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9223c563-1f78-44b7-ba9d-a7d85240aa22','06091d96-7923-492b-9df6-fdd5121d2665','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('92d45d25-d177-4743-827c-5180088d8380','0e42224c-14f4-45eb-8530-5ef1d6632ce3','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('98b60271-d0a8-4f2e-b89f-ea716614521a','550d44d3-b260-4a20-bbb0-e0d1256f6ee8','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('98ed6549-465a-4645-ab9b-85272aba2558','6292863a-7510-4b2f-8cc3-f1854ceac699','118a2ede-ff60-41fa-aca1-c8f2b15aaba8',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'b','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9a1a3610-6ab1-48e6-a834-31049690a04d','cc98d720-32c0-4a97-a30d-ade119a774d8','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9b6a0211-516a-4db8-955c-815338622c7e','b2b93b72-d77f-4b12-a89c-9946b18d92a4','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9bdad885-e684-4275-a135-8223f8bfb1cf','b6f85825-5a5a-4926-87ef-f39b3b630c0c','07f68100-cb6b-4976-b89f-0b54b40b7476',3.000,11.9000,35.70,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9c1e5a5d-6d4b-48e1-84d7-c8ab3237bd62','9f658dd0-faeb-435b-b58a-a8e0942816ad','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9e51ae15-305f-4581-9691-aeb966e98be2','2a39f31b-3a74-440a-aa74-c68bf7ca7a62','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9e63e687-a840-4dda-9701-783cd8fd5bc2','26435219-b3d4-4f47-ac42-04e8dc76fd1d','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9ef82f5e-be4f-45d8-89d1-9da933832ce1','35027b98-1dce-46ae-b2e2-31f7528f234e','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',12.000,68.0000,816.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('9fb8abd8-c234-4e22-b88f-e3d7095ccbbe','a30cb1db-2889-45c9-ac45-a4a0dd7e0068','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a0e802c2-8b2e-40a0-be01-8def3b687a2e','2aa345ae-9946-4640-8671-051d8fe4c091','1210b33a-b250-4a7a-8df8-92cfd0de5ab3',1.000,7.5000,7.50,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a373ddb5-9cf2-465c-bce8-aa1c4696b176','00e0a1da-9107-4399-9a98-6813bf5d62f7','d4967421-6962-4fe6-97f9-74d567b76f56',1.000,18.0000,18.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Copão: Gin e Tropical 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a6484f01-f11d-4eba-b84c-84f47765f3f6','f105ebb6-ca7f-4ab0-adf2-df7a281db51d','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a6f13877-c44c-4d22-a5ff-cbfe9ce8a5d9','4c5e8301-4105-454e-be6a-804f7cf53af7','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a756f54d-c571-4afb-b432-aba609fa1e24','3ee6e4b8-5994-4349-bbee-4c567ee9fa7e','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('a920b00a-a2da-4c67-ac9f-9ac95489b493','a3bb2a52-1107-4f85-bfa1-344e650ad408','d5d2759a-f147-48d0-a55a-d8ca49f32d9a',1.000,3.0000,3.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Trident Melancia','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ae553b22-3678-4200-a2f0-cf485470d13c','29651848-6e51-48bd-bc87-42e6c610e60c','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('afd142a4-753f-4cd0-a264-aa70eed204eb','082808b1-e3de-4385-b51d-953dee491299','1210b33a-b250-4a7a-8df8-92cfd0de5ab3',1.000,7.5000,7.50,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b01e7963-7513-4997-bb0a-da48f9741ae2','54208b37-9c08-4db6-9440-ff8461a46525','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b0e58bd9-51bc-47de-bd8e-191a35412f79','96e5f3ca-de23-4ed9-8dc2-fab6a96e91e6','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b1a1f091-1f73-40f8-a81e-e15b16b13084','3ee6e4b8-5994-4349-bbee-4c567ee9fa7e','0b2b0d9e-8189-4126-9fc6-49cd76139b53',1.000,3.5000,3.50,0.00,0.00,0.00,'0302100','5102','102','99','','99',0.00,'22030000',0,'Bavaria','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b209fe71-0b80-43cf-810b-cae98b930528','96e5f3ca-de23-4ed9-8dc2-fab6a96e91e6','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b38ad9df-7b60-4410-bedd-d5a1c95bd8a8','00e0a1da-9107-4399-9a98-6813bf5d62f7','691a30d8-326c-4ca5-9a4b-13fe02b39314',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'cp','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b3f4ffb8-5a99-4c77-a2af-69e8dbc6a385','d757670e-5b1a-498b-8ddd-4300ca3578bf','ca93d417-41ba-4915-90f6-02b13334620f',1.000,10.0000,10.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Copo Descartável 400ml (50 un)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b45b02bc-73d8-4f5b-ad5f-f7f7432aabfb','0611dcc6-f644-4bc7-b6df-263162449b86','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b460f4b3-bc63-469e-9be8-cfe8ef938997','2aa345ae-9946-4640-8671-051d8fe4c091','1488c3aa-e255-4254-8941-bb039861b891',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b9101b60-04d4-44d6-a4e8-0f3ef1d0ff80','184d4580-3cda-47ad-8558-2209514a414a','2659cb16-0449-4fa8-be68-a9214f79d04b',1.000,4.9000,4.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Brahma Duplo Malte Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('b9ff5d9e-1232-4707-9405-ae9acd608989','abb117a3-ca12-4b5a-b529-a14e442068ac','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ba6d6802-36e2-44fe-a405-89901868033b','2aa345ae-9946-4640-8671-051d8fe4c091','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('bacee6d4-df84-48ba-9e1f-f368641f91c6','ff92783c-cf89-4d36-8667-186914e22571','f41dd72f-f76a-4328-9089-c1dd0abebee5',1.000,6.0000,6.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'i','UN',0.00,0.00,0.00,0.0000,0,NULL),
('bb4cef6d-0964-4fa2-bf7a-ade58e543cff','b678f46c-0b9e-4bad-a2cb-f45a7e4e90f3','1210b33a-b250-4a7a-8df8-92cfd0de5ab3',2.000,7.5000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Suco Del Valle Pêssego 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('beafcf3f-b6cd-4aca-a58b-721108e76c37','c272c02a-21df-492b-b465-120ef7a4402c','0e4a7708-e7c9-4fe7-b832-80139dc973f9',12.000,4.0000,48.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Lata 350ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('bff7d1c3-ba8e-413f-a058-a195e6669ddf','60bb630f-faf5-40d4-821a-108c311b6211','b85632f8-6632-4203-9974-945ebbf5b303',2.000,6.0000,12.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amendoim Japones Dori','UN',0.00,0.00,0.00,0.0000,0,NULL),
('c02c2fb6-c2e8-431a-8aea-fc08145d5aee','c236fa5d-9a71-47cb-9d67-7ee4e2d10f2c','2660090c-2cfc-467f-b0df-b66e5aad8498',2.000,4.8000,9.60,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('c1624665-c935-49e6-a0dc-330a4bae05c3','35027b98-1dce-46ae-b2e2-31f7528f234e','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',12.000,2.5000,30.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('c27d70d0-a3a3-47c9-a8bf-12353da51ca5','d757670e-5b1a-498b-8ddd-4300ca3578bf','4ce0585b-84ac-46b4-b287-771e9fed7703',1.000,155.0000,155.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Red Label + 4 Red Bull + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('c9f9a036-bf5b-407c-95fa-723a073b97f5','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ca385f86-3471-411d-96ea-c6a8f6c5c0e6','cc98d720-32c0-4a97-a30d-ade119a774d8','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('cb98954a-3382-47c2-903e-dfd252b33d94','085db324-a780-4f67-a5b7-c8d55b91ef16','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('cd5281cd-7e9c-4574-bba7-850485b2b870','fd06366a-5461-40dd-8866-e2dc6796985e','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',2.000,2.5000,5.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('cdd02665-6e2d-4521-ab67-db259048a427','6dbcaad8-db3d-438d-943e-e5cb318d6f82','848b5f2b-1743-422b-9f26-92f3051071f5',5.000,79.9000,399.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Gin Gordon\'s 750ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('d1395887-639e-413a-a1d2-85984b4f186b','fcbd3ca9-aa20-498a-ae65-ed2cf93a0511','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('d2f124e9-22b7-4847-816f-062afbed1431','7dbe28bf-6864-4cd7-93c1-449a404c287d','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('d471cc75-b6e5-4fb5-8b00-3f82d2ba56fc','2259cd42-64ee-4595-af8e-5af0b140d41e','0e4a7708-e7c9-4fe7-b832-80139dc973f9',1.000,4.0000,4.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('da06cc46-ba1a-4266-8bff-6b722b8d7fbe','f8552049-ba9c-4738-b970-09d1bf060b29','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,NULL,NULL,'99',NULL,'99',0.00,NULL,0,'','UN',0.00,0.00,0.00,0.0000,0,NULL),
('da7a4000-ae32-4cd3-9759-7a4b7b912875','eda39234-bd8f-4c87-be5d-3caf34dc72b8','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('db4be659-3361-43e2-aa10-2a3a6791dd36','4f42fcf3-c794-4334-81ec-43005e772b1e','b85632f8-6632-4203-9974-945ebbf5b303',1.000,6.0000,6.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amendoim Japones Dori','UN',0.00,0.00,0.00,0.0000,0,NULL),
('dbadf2df-23ec-4d11-aac8-1443c2598284','c91f592e-589b-4a73-a401-caf7540c21cb','9ef9aafa-8e60-4ace-afc8-fcf3f3554cd0',1.000,7.5000,7.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Cheetos Queijo 75g','UN',0.00,0.00,0.00,0.0000,0,NULL),
('dd107677-296c-4e03-a480-7f0ed7c49a1f','82be98d8-afcf-41a8-8a18-7e5d637290ac','01bb5da5-2162-4b0d-a14f-629eb7f53b10',7.000,300.0000,2100.00,0.00,0.00,0.00,'0000001','5102','102','99','','99',0.00,'25002252',0,'notbook','UN',0.00,0.00,0.00,0.0000,0,NULL),
('de8b6bb6-8446-4b3b-a422-b8140fc9fba7','0d32bbdc-8aeb-4ac4-ba5d-11d5c402eb68','01bb5da5-2162-4b0d-a14f-629eb7f53b10',1.000,300.0000,300.00,0.00,0.00,0.00,'0000001','5102','102','99','','99',0.00,'25002252',0,'notbook','UN',0.00,0.00,0.00,0.0000,0,NULL),
('e027dc32-dbe1-4b4b-b9e9-1be168677203','7b43903f-73f5-4679-a50e-2fbb2d707254','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('e3ea5871-ad2b-48a5-9f8b-7c11989c83e0','184d4580-3cda-47ad-8558-2209514a414a','1488c3aa-e255-4254-8941-bb039861b891',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'teste','UN',0.00,0.00,0.00,0.0000,0,NULL),
('e94ccec9-3e8c-463c-baad-f184c78993c7','7b43903f-73f5-4679-a50e-2fbb2d707254','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('e9a76c4f-4434-4a86-b8de-5ed5c6e5689c','9bf774a8-887a-4d91-abf5-f8bda4f777c3','990752a0-ecf0-4504-8b85-239ca385ef9e',1.000,1100.5000,1100.50,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'a','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ebb684f8-486a-4af5-858a-7e3d059bd4de','4c5e8301-4105-454e-be6a-804f7cf53af7','c3714b58-3255-41c8-b970-abf9daf03b5b',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Morango/Pêssego 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ebc780af-b467-4d77-b857-d918a3c16e2e','06091d96-7923-492b-9df6-fdd5121d2665','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ec2c3234-1af1-4ec7-98f2-8af7de205c9b','1573ef1b-fbf0-4982-b9ba-b2fe48619fb1','7fa4da07-f34c-461a-b79b-a83ce3caae67',1.000,12.5000,12.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Cigarro Carlton Box','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ee500e06-9986-474b-9dfe-67dabdb238ab','d757670e-5b1a-498b-8ddd-4300ca3578bf','5a2f32cf-6f01-4246-b3a7-5d45ace8dd5c',1.000,1.5000,1.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Copo Acrílico (Unidade)','UN',0.00,0.00,0.00,0.0000,0,NULL),
('eeb3c698-fc28-48de-a7e3-5cd70665408c','71e3f0df-9bd8-40c4-94e9-ac4d0ee71da5','2181f3dd-5f2c-4712-bedc-604a5ef4cc4a',1.000,2.5000,2.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral c/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('eefa958c-0fe5-42ec-8755-b898b4944d3c','0e42224c-14f4-45eb-8530-5ef1d6632ce3','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f29a9949-b1f2-403a-990c-abc3330ebce2','717677f1-9592-4a81-b0ac-c7db938ba284','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f34074cd-d9d1-4f2e-9a6a-f4872e3f74ca','fbf2871f-da86-4059-b29a-ffc3b59a1ea0','07f68100-cb6b-4976-b89f-0b54b40b7476',3.000,11.9000,35.70,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f5b9e111-d233-473b-85a4-325122c5d2a4','18a745e2-2062-461f-9ed6-8447978d4ce5','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f68101b7-d150-4492-a0a1-d3cf728d1138','0f816383-f75e-4169-9dc5-15e1ba4ecf08','a1da8c5e-a99e-4fb3-be71-a7b590c1eada',1.000,98.0000,98.00,0.00,0.00,0.00,NULL,'5102','102','99','','99',0.00,NULL,0,'teste98','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f6c17684-23d9-4a44-963b-576e3ed54abc','00e0a1da-9107-4399-9a98-6813bf5d62f7','5d43206c-3990-4a1a-8a83-fea700078f6d',1.000,6.9000,6.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Corona Long Neck 330ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f6fe6c33-8319-4456-9e67-dc77804d64fb','26435219-b3d4-4f47-ac42-04e8dc76fd1d','7fa4da07-f34c-461a-b79b-a83ce3caae67',1.000,12.5000,12.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Cigarro Carlton Box','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f71beded-a5bb-445f-924d-97d12c958e8f','9316179c-e775-4931-9cb8-daee94cd8f3c','035fe5c1-c2d0-42e6-989c-2f9440b00872',1.000,8.5000,8.50,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Guaraná Antarctica 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('f96e4fad-683d-4e1d-8cb2-0db6d153a06f','96e5f3ca-de23-4ed9-8dc2-fab6a96e91e6','2b880eb1-795b-4460-82fb-d2957918b107',1.000,95.0000,95.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Absolut Vodka 1L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('fcc9e9e5-1c9d-4111-a2bb-a02eda25cdda','3c911cf0-f5f5-4d1c-8373-35f122d0d8a0','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('fd27be58-c50e-4293-8274-8c24f4989bc3','3ee6e4b8-5994-4349-bbee-4c567ee9fa7e','a7fc94f2-9263-4b4c-8628-0ba78771d697',1.000,15.0000,15.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Baly Tradicional 2L','UN',0.00,0.00,0.00,0.0000,0,NULL),
('fe43d58e-5c54-451b-a0c4-92e75f4389f8','2c780963-8cd1-4a00-8ef9-2520cc7c18c0','54cb53bc-618d-48de-8f79-e958f1b33311',1.000,2.0000,2.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Água Mineral s/ Gás 500ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('fece2a49-3f64-4ac8-82a9-6eecc06f7f5a','085db324-a780-4f67-a5b7-c8d55b91ef16','2660090c-2cfc-467f-b0df-b66e5aad8498',1.000,4.8000,4.80,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Amstel Latão 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ff1d868e-114f-466e-b3ed-d68546115d21','3a703c2b-058b-4c39-b200-5b45cd6417d6','11ca0fb1-1deb-471b-b0ff-dff04c9cdf7e',1.000,68.0000,68.00,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Combo: Vodka Smirnoff + Baly 2L + Gelo','UN',0.00,0.00,0.00,0.0000,0,NULL),
('ff610141-23a5-42d4-a686-26d664b283bc','7b6ca071-4c2c-4a4b-814b-e419d544211a','07f68100-cb6b-4976-b89f-0b54b40b7476',1.000,11.9000,11.90,0.00,0.00,0.00,NULL,'5102',NULL,'99',NULL,'99',0.00,NULL,0,'Monster Energy 473ml','UN',0.00,0.00,0.00,0.0000,0,NULL);
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
  `total` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `consumidorCpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consumidorNome` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emitirNfce` tinyint(1) NOT NULL DEFAULT '0',
  `nfceAutorizadaEm` datetime(3) DEFAULT NULL,
  `nfceChave` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceCodRejeicao` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceMotivoRejeicao` text COLLATE utf8mb4_unicode_ci,
  `nfceNumero` int DEFAULT NULL,
  `nfceProtocolo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceQrcode` text COLLATE utf8mb4_unicode_ci,
  `nfceSerie` int DEFAULT NULL,
  `nfceStatus` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfceXml` longtext COLLATE utf8mb4_unicode_ci,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cashRegisterId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelReason` text COLLATE utf8mb4_unicode_ci,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pdv',
  `addition` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_nfceChave_key` (`nfceChave`),
  KEY `sales_customerId_fkey` (`customerId`),
  KEY `sales_cashRegisterId_fkey` (`cashRegisterId`),
  KEY `sales_operatorId_fkey` (`operatorId`),
  KEY `sales_createdAt_idx` (`createdAt`),
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
('004f8567-4056-4fc1-a5ca-74e48f1958ed',NULL,7.30,0.00,'completed','2026-05-10 22:56:12.992','2026-05-10 22:56:12.992',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,7.30,'1ec3f199-7373-469b-b2ad-a2b1076e8fea',NULL,NULL,'pdv',0.00),
('00e0a1da-9107-4399-9a98-6813bf5d62f7',NULL,49.90,0.00,'completed','2026-05-09 03:50:40.601','2026-05-09 03:50:40.601',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,49.90,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('06091d96-7923-492b-9df6-fdd5121d2665',NULL,20.40,0.00,'completed','2026-05-06 04:44:27.872','2026-05-06 04:44:27.872',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,20.40,NULL,NULL,NULL,'pdv',0.00),
('0611dcc6-f644-4bc7-b6df-263162449b86',NULL,7.30,0.00,'completed','2026-05-10 22:50:31.612','2026-05-10 22:50:31.612',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,7.30,'3de17897-7085-4988-bb6f-fbc712c6e1f8',NULL,NULL,'pdv',0.00),
('082808b1-e3de-4385-b51d-953dee491299',NULL,87.40,0.00,'completed','2026-04-02 00:46:16.368','2026-04-02 00:46:16.368',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('085db324-a780-4f67-a5b7-c8d55b91ef16',NULL,7.30,0.00,'completed','2026-05-08 22:38:30.762','2026-05-08 22:38:30.779',NULL,NULL,1,NULL,NULL,NULL,NULL,20,NULL,NULL,1,'nao_emitida',NULL,NULL,7.30,'a2d561cb-bb0a-4076-be99-e7dea9a197ad',NULL,NULL,'pdv',0.00),
('0b8c6592-77c7-4b2f-97b8-3f4edda014cc',NULL,8.50,0.00,'completed','2026-05-08 22:37:00.683','2026-05-08 22:37:39.976',NULL,NULL,1,NULL,NULL,NULL,NULL,18,NULL,NULL,1,'nao_emitida',NULL,NULL,8.50,'a2d561cb-bb0a-4076-be99-e7dea9a197ad',NULL,NULL,'pdv',0.00),
('0d2760e6-81ac-462e-9485-9ba6fbc12043',NULL,19.80,0.00,'completed','2026-05-10 22:34:15.420','2026-05-10 22:34:15.420',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,19.80,'88b1bb6d-2f3b-49da-96c0-0f8b80682329',NULL,NULL,'pdv',0.00),
('0d32bbdc-8aeb-4ac4-ba5d-11d5c402eb68',NULL,300.00,0.00,'completed','2026-05-06 04:40:31.734','2026-05-06 04:43:08.646',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,300.00,NULL,NULL,NULL,'pdv',0.00),
('0e42224c-14f4-45eb-8530-5ef1d6632ce3',NULL,88.40,0.00,'completed','2026-05-06 04:29:47.142','2026-05-06 04:43:07.718',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,88.40,NULL,NULL,NULL,'pdv',0.00),
('0e589777-3824-4e77-a182-908242034510',NULL,3.50,0.00,'completed','2026-05-06 04:32:11.601','2026-05-06 04:32:11.601',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3.50,NULL,NULL,NULL,'pdv',0.00),
('0f816383-f75e-4169-9dc5-15e1ba4ecf08',NULL,207.99,0.00,'completed','2026-05-09 03:49:26.049','2026-05-09 03:49:26.049',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,207.99,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('14366ac5-5b2c-4bc4-be10-db4d871d068f',NULL,15.00,0.00,'completed','2026-05-07 16:41:31.235','2026-05-07 16:41:31.254',NULL,NULL,1,NULL,NULL,NULL,NULL,3,NULL,NULL,1,'nao_emitida',NULL,NULL,15.00,NULL,NULL,NULL,'pdv',0.00),
('1573ef1b-fbf0-4982-b9ba-b2fe48619fb1',NULL,115.80,0.00,'completed','2026-05-10 22:09:06.187','2026-05-10 22:09:06.201',NULL,NULL,1,NULL,NULL,NULL,NULL,30,NULL,NULL,1,'nao_emitida',NULL,NULL,115.80,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('16bba9af-16de-415b-9435-91a741853f0a',NULL,0.00,0.00,'completed','2026-05-06 04:30:28.010','2026-05-06 04:43:08.296',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('172dc460-53d6-4372-be1b-60eee3c57638',NULL,10.00,0.00,'completed','2026-05-08 22:41:23.587','2026-05-08 22:42:04.384',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,10.00,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('184d4580-3cda-47ad-8558-2209514a414a',NULL,6.90,0.00,'completed','2026-05-08 05:17:32.808','2026-05-08 05:17:32.830',NULL,NULL,1,NULL,NULL,NULL,NULL,9,NULL,NULL,1,'nao_emitida',NULL,NULL,6.90,NULL,NULL,NULL,'pdv',0.00),
('18a745e2-2062-461f-9ed6-8447978d4ce5',NULL,9.30,0.00,'completed','2026-05-08 22:25:55.556','2026-05-08 22:25:55.556',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,9.30,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('1b6cd5c9-052d-4e36-bf21-a9fdf9924975',NULL,7.50,0.00,'completed','2026-05-06 04:32:50.235','2026-05-06 04:32:50.235',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,7.50,NULL,NULL,NULL,'pdv',0.00),
('20f3aced-0357-4562-90d0-43c7c240fabf',NULL,14.00,0.00,'completed','2026-05-08 22:26:39.675','2026-05-08 22:26:39.689',NULL,NULL,1,NULL,NULL,NULL,NULL,14,NULL,NULL,1,'nao_emitida',NULL,NULL,14.00,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('2259cd42-64ee-4595-af8e-5af0b140d41e',NULL,4.00,0.00,'completed','2026-04-30 22:53:19.217','2026-04-30 22:53:19.217',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('26435219-b3d4-4f47-ac42-04e8dc76fd1d',NULL,80.50,0.00,'completed','2026-05-09 03:50:46.447','2026-05-09 03:50:46.447',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,80.50,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('29651848-6e51-48bd-bc87-42e6c610e60c',NULL,95.00,0.00,'completed','2026-05-09 03:47:39.906','2026-05-09 03:47:39.937',NULL,NULL,1,NULL,NULL,NULL,NULL,24,NULL,NULL,1,'nao_emitida',NULL,NULL,95.00,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('2a39f31b-3a74-440a-aa74-c68bf7ca7a62',NULL,99.80,0.00,'completed','2026-05-08 22:46:15.098','2026-05-08 22:46:15.098',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,99.80,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('2aa345ae-9946-4640-8671-051d8fe4c091',NULL,25.40,0.00,'completed','2026-04-30 21:47:03.221','2026-04-30 21:47:03.221',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('2bf83882-e459-46f7-b376-aff69bfdacdd',NULL,8.50,0.00,'completed','2026-04-16 22:01:40.291','2026-04-16 22:01:40.291',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('2c780963-8cd1-4a00-8ef9-2520cc7c18c0',NULL,2.00,0.00,'completed','2026-05-08 22:26:15.106','2026-05-08 22:26:15.118',NULL,NULL,1,NULL,NULL,NULL,NULL,12,NULL,NULL,1,'nao_emitida',NULL,NULL,2.00,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('2eac5b9a-bbd1-4df3-95e1-7c5f4537b3ca',NULL,84.50,0.00,'completed','2026-05-08 05:30:22.287','2026-05-08 05:30:22.305',NULL,NULL,1,NULL,NULL,NULL,NULL,10,NULL,NULL,1,'nao_emitida',NULL,NULL,84.50,NULL,NULL,NULL,'pdv',0.00),
('2f0aff2d-3597-42bf-8a5f-656793ae0431',NULL,0.00,0.00,'completed','2026-05-06 00:13:28.530','2026-05-06 00:13:28.530',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('34ea8ce6-a995-4ae8-a3e1-2d0c06a30455',NULL,11.90,0.00,'completed','2026-05-08 03:36:37.384','2026-05-08 03:36:37.402',NULL,NULL,1,NULL,NULL,NULL,NULL,8,NULL,NULL,1,'nao_emitida',NULL,NULL,11.90,NULL,NULL,NULL,'pdv',0.00),
('35027b98-1dce-46ae-b2e2-31f7528f234e',NULL,846.00,0.00,'completed','2026-04-02 00:28:26.411','2026-04-02 00:28:26.411',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('36bda116-fd21-4e4f-b2ef-526a80e9fe5d',NULL,2.50,0.00,'completed','2026-05-10 22:17:26.659','2026-05-10 22:17:26.659',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2.50,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('38af7198-390b-44d7-b460-6a4109dd7b53',NULL,233.00,0.00,'completed','2026-05-09 03:50:33.930','2026-05-09 03:50:33.930',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,233.00,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('3a703c2b-058b-4c39-b200-5b45cd6417d6',NULL,68.00,0.00,'completed','2026-05-08 05:20:21.175','2026-05-08 05:21:09.837',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,68.00,NULL,NULL,NULL,'pdv',0.00),
('3b6fc790-c900-4b57-9c8b-1fe76327fa2d',NULL,7.50,0.00,'completed','2026-04-02 00:46:23.142','2026-04-02 00:46:23.142',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('3c911cf0-f5f5-4d1c-8373-35f122d0d8a0',NULL,36.90,0.00,'completed','2026-05-08 22:36:52.571','2026-05-08 22:42:04.008',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,36.90,'a2d561cb-bb0a-4076-be99-e7dea9a197ad',NULL,NULL,'pdv',0.00),
('3e56d6f5-06d6-4e6c-b423-b83053205bd7',NULL,2.50,0.00,'completed','2026-05-08 22:38:20.211','2026-05-08 22:38:20.221',NULL,NULL,1,NULL,NULL,NULL,NULL,19,NULL,NULL,1,'nao_emitida',NULL,NULL,2.50,'a2d561cb-bb0a-4076-be99-e7dea9a197ad',NULL,NULL,'pdv',0.00),
('3ee6e4b8-5994-4349-bbee-4c567ee9fa7e',NULL,23.30,0.00,'completed','2026-05-10 22:47:54.729','2026-05-10 22:47:54.729',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,23.30,'fec9b6e8-23a7-4fa3-8fd8-cb3a5b13c29a',NULL,NULL,'pdv',0.00),
('44baecf4-7142-4d76-be91-9215de3d288f',NULL,95.00,0.00,'completed','2026-05-09 03:48:51.383','2026-05-09 03:48:51.407',NULL,NULL,1,NULL,NULL,NULL,NULL,25,NULL,NULL,1,'nao_emitida',NULL,NULL,95.00,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('4c5e8301-4105-454e-be6a-804f7cf53af7',NULL,27.00,0.00,'completed','2026-05-09 03:47:16.018','2026-05-09 03:47:16.046',NULL,NULL,1,NULL,NULL,NULL,NULL,23,NULL,NULL,1,'nao_emitida',NULL,NULL,27.00,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('4f42fcf3-c794-4334-81ec-43005e772b1e',NULL,6.00,0.00,'completed','2026-05-08 22:27:20.614','2026-05-08 22:27:20.627',NULL,NULL,1,NULL,NULL,NULL,NULL,15,NULL,NULL,1,'nao_emitida',NULL,NULL,6.00,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('4f6188f3-bdf0-48cc-baa2-882b2e776d88',NULL,18.50,0.00,'completed','2026-05-10 22:33:20.988','2026-05-10 22:33:20.988',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,18.50,'88b1bb6d-2f3b-49da-96c0-0f8b80682329',NULL,NULL,'pdv',0.00),
('50d6f909-c2fd-4fa9-a49c-3953a8fe2b61',NULL,19.80,0.00,'completed','2026-05-10 22:56:33.628','2026-05-10 22:56:33.628',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,19.80,'1ec3f199-7373-469b-b2ad-a2b1076e8fea',NULL,NULL,'pdv',0.00),
('54208b37-9c08-4db6-9440-ff8461a46525',NULL,15.90,0.00,'completed','2026-05-06 00:13:23.596','2026-05-06 00:13:23.612',NULL,NULL,1,NULL,NULL,NULL,NULL,1,NULL,NULL,1,'nao_emitida',NULL,NULL,15.90,NULL,NULL,NULL,'pdv',0.00),
('550d44d3-b260-4a20-bbb0-e0d1256f6ee8',NULL,3.50,0.00,'completed','2026-05-07 16:16:34.775','2026-05-07 16:16:34.788',NULL,NULL,1,NULL,NULL,NULL,NULL,2,NULL,NULL,1,'nao_emitida',NULL,NULL,3.50,NULL,NULL,NULL,'pdv',0.00),
('60bb630f-faf5-40d4-821a-108c311b6211',NULL,135.20,0.00,'completed','2026-05-08 22:46:57.634','2026-05-08 22:46:57.634',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,135.20,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('6292863a-7510-4b2f-8cc3-f1854ceac699',NULL,38.30,0.00,'completed','2026-05-10 22:34:02.435','2026-05-10 22:34:02.435',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,38.30,'88b1bb6d-2f3b-49da-96c0-0f8b80682329',NULL,NULL,'pdv',0.00),
('67625e1b-35a7-4fd6-8be5-d8ec60955ff4',NULL,4.50,0.00,'completed','2026-05-10 23:14:01.330','2026-05-10 23:14:01.330',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4.50,'1ec3f199-7373-469b-b2ad-a2b1076e8fea',NULL,NULL,'pdv',0.00),
('682dc350-b821-4ea7-af09-453b08870679',NULL,35.70,0.00,'completed','2026-04-01 02:07:39.642','2026-04-01 02:07:39.642',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('6dbcaad8-db3d-438d-943e-e5cb318d6f82',NULL,402.00,0.00,'completed','2026-05-10 22:34:26.017','2026-05-10 22:34:26.017',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,402.00,'88b1bb6d-2f3b-49da-96c0-0f8b80682329',NULL,NULL,'pdv',0.00),
('717677f1-9592-4a81-b0ac-c7db938ba284',NULL,95.00,0.00,'completed','2026-05-08 18:19:18.488','2026-05-08 18:19:18.501',NULL,NULL,1,NULL,NULL,NULL,NULL,11,NULL,NULL,1,'nao_emitida',NULL,NULL,95.00,NULL,NULL,NULL,'pdv',0.00),
('71e3f0df-9bd8-40c4-94e9-ac4d0ee71da5',NULL,97.50,0.00,'completed','2026-05-09 03:49:02.518','2026-05-09 03:49:02.531',NULL,NULL,1,NULL,NULL,NULL,NULL,26,NULL,NULL,1,'nao_emitida',NULL,NULL,97.50,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('740fbee4-0fe0-4e66-9106-b1eb605f6f0e',NULL,7.30,0.00,'completed','2026-05-07 16:17:10.439','2026-05-07 16:17:15.917',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,7.30,NULL,NULL,NULL,'pdv',0.00),
('7a7efde9-200e-494c-9b05-8f6db48b4ed3',NULL,4.80,0.00,'completed','2026-05-10 22:17:39.487','2026-05-10 22:17:39.487',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4.80,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('7b43903f-73f5-4679-a50e-2fbb2d707254',NULL,19.80,0.00,'completed','2026-05-10 22:50:39.747','2026-05-10 22:50:39.747',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,19.80,'3de17897-7085-4988-bb6f-fbc712c6e1f8',NULL,NULL,'pdv',0.00),
('7b6ca071-4c2c-4a4b-814b-e419d544211a',NULL,11.90,0.00,'completed','2026-05-07 19:56:33.556','2026-05-07 19:56:33.572',NULL,NULL,1,NULL,NULL,NULL,NULL,7,NULL,NULL,1,'nao_emitida',NULL,NULL,11.90,NULL,NULL,NULL,'pdv',0.00),
('7dbe28bf-6864-4cd7-93c1-449a404c287d',NULL,15.00,0.00,'completed','2026-05-08 22:47:14.568','2026-05-08 22:47:14.580',NULL,NULL,1,NULL,NULL,NULL,NULL,22,NULL,NULL,1,'nao_emitida',NULL,NULL,15.00,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('82be98d8-afcf-41a8-8a18-7e5d637290ac',NULL,2100.00,0.00,'completed','2026-05-06 04:45:14.903','2026-05-06 04:45:50.617',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2100.00,NULL,NULL,NULL,'pdv',0.00),
('8924c514-0882-4e07-be00-3fd52e0805e6',NULL,99.00,0.00,'completed','2026-05-10 23:16:58.822','2026-05-10 23:16:58.822',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,99.00,'525ba6b5-964e-4ae5-95ec-0046408208bb',NULL,NULL,'pdv',0.00),
('9316179c-e775-4931-9cb8-daee94cd8f3c',NULL,8.50,0.00,'completed','2026-05-07 16:41:44.297','2026-05-07 16:41:44.305',NULL,NULL,1,NULL,NULL,NULL,NULL,4,NULL,NULL,1,'nao_emitida',NULL,NULL,8.50,NULL,NULL,NULL,'pdv',0.00),
('96e5f3ca-de23-4ed9-8dc2-fab6a96e91e6',NULL,103.80,0.00,'completed','2026-05-10 22:14:14.150','2026-05-10 22:14:14.150',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,103.80,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('9746300b-81c2-4cc0-ab15-5dccb8a5f624',NULL,3.50,0.00,'completed','2026-05-08 22:41:01.552','2026-05-08 22:41:01.552',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3.50,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('9a2d49f9-c7ac-4e95-b04b-22a2854ff87b',NULL,68.00,0.00,'completed','2026-05-08 05:21:04.116','2026-05-08 05:21:09.877',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,68.00,NULL,NULL,NULL,'pdv',0.00),
('9b9ae61a-f3aa-4207-ae46-17895fc06007',NULL,4.00,0.00,'completed','2026-05-07 16:47:42.823','2026-05-07 16:47:42.835',NULL,NULL,1,NULL,NULL,NULL,NULL,6,NULL,NULL,1,'nao_emitida',NULL,NULL,4.00,NULL,NULL,NULL,'pdv',0.00),
('9bf774a8-887a-4d91-abf5-f8bda4f777c3',NULL,1100.50,0.00,'completed','2026-05-10 22:46:32.939','2026-05-10 22:46:32.939',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1100.50,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('9f658dd0-faeb-435b-b58a-a8e0942816ad',NULL,19.80,0.00,'completed','2026-05-10 22:33:14.296','2026-05-10 22:33:14.296',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,19.80,'88b1bb6d-2f3b-49da-96c0-0f8b80682329',NULL,NULL,'pdv',0.00),
('a30cb1db-2889-45c9-ac45-a4a0dd7e0068',NULL,19.80,0.00,'completed','2026-05-10 22:46:08.352','2026-05-10 22:46:08.352',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,19.80,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('a3bb2a52-1107-4f85-bfa1-344e650ad408',NULL,135.99,0.00,'completed','2026-05-09 03:49:35.312','2026-05-09 03:49:35.312',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,135.99,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00),
('a43698af-b2f3-4b85-8379-71ecab69493d',NULL,600.00,0.00,'completed','2026-05-06 04:45:24.528','2026-05-06 04:45:50.822',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,600.00,NULL,NULL,NULL,'pdv',0.00),
('a79c0ebf-9880-4229-86ba-75206a376e4a',NULL,4.00,0.00,'completed','2026-05-06 04:42:56.845','2026-05-06 04:42:56.845',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4.00,NULL,NULL,NULL,'pdv',0.00),
('abb117a3-ca12-4b5a-b529-a14e442068ac',NULL,4.50,0.00,'completed','2026-05-10 22:45:05.043','2026-05-10 22:45:05.043',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4.50,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('b1ed3c3a-0e7d-4953-886d-f8c879b39352',NULL,2.00,0.00,'completed','2026-05-10 22:09:45.065','2026-05-10 22:09:45.065',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2.00,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('b2b93b72-d77f-4b12-a89c-9946b18d92a4',NULL,15.00,0.00,'completed','2026-05-10 22:09:14.526','2026-05-10 22:09:14.526',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,15.00,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('b678f46c-0b9e-4bad-a2cb-f45a7e4e90f3',NULL,15.00,0.00,'completed','2026-05-06 04:30:40.218','2026-05-06 04:43:08.395',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,15.00,NULL,NULL,NULL,'pdv',0.00),
('b6f85825-5a5a-4926-87ef-f39b3b630c0c',NULL,35.70,0.00,'completed','2026-05-06 04:34:58.489','2026-05-06 04:43:08.516',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.70,NULL,NULL,NULL,'pdv',0.00),
('c236fa5d-9a71-47cb-9d67-7ee4e2d10f2c',NULL,9.60,0.00,'completed','2026-05-08 22:27:52.580','2026-05-08 22:27:52.590',NULL,NULL,1,NULL,NULL,NULL,NULL,17,NULL,NULL,1,'nao_emitida',NULL,NULL,9.60,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('c272c02a-21df-492b-b465-120ef7a4402c',NULL,48.00,0.00,'completed','2026-05-07 16:42:15.363','2026-05-07 16:42:15.373',NULL,NULL,1,NULL,NULL,NULL,NULL,5,NULL,NULL,1,'nao_emitida',NULL,NULL,48.00,NULL,NULL,NULL,'pdv',0.00),
('c28c0610-5fa3-4e6b-b436-ab2fc3f87ed7',NULL,1100.50,0.00,'completed','2026-05-08 22:27:39.291','2026-05-08 22:27:39.299',NULL,NULL,1,NULL,NULL,NULL,NULL,16,NULL,NULL,1,'nao_emitida',NULL,NULL,1100.50,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('c83d46e0-8a33-4890-9152-ba88e10e187a',NULL,35.70,0.00,'completed','2026-05-08 05:20:07.029','2026-05-08 05:21:09.193',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.70,NULL,NULL,NULL,'pdv',0.00),
('c91f592e-589b-4a73-a401-caf7540c21cb',NULL,32.50,0.00,'completed','2026-05-09 03:50:53.098','2026-05-10 22:06:22.599',NULL,NULL,1,NULL,NULL,NULL,NULL,29,NULL,NULL,1,'nao_emitida',NULL,NULL,32.50,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('cc98d720-32c0-4a97-a30d-ade119a774d8',NULL,4.50,0.00,'completed','2026-05-08 22:40:49.464','2026-05-08 22:40:49.481',NULL,NULL,1,NULL,NULL,NULL,NULL,21,NULL,NULL,1,'nao_emitida',NULL,NULL,4.50,'b48d6c0a-d089-472e-9275-0eb96f7ec480',NULL,NULL,'pdv',0.00),
('cca86195-910d-4783-a1d0-90e2b21872bd',NULL,14.50,0.00,'completed','2026-04-02 01:09:47.694','2026-04-02 01:09:47.694',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('cd1490b4-e9fc-4005-9045-26e2f71045bc',NULL,3.50,0.00,'completed','2026-05-06 04:31:23.042','2026-05-06 04:31:23.042',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3.50,NULL,NULL,NULL,'pdv',0.00),
('d757670e-5b1a-498b-8ddd-4300ca3578bf',NULL,254.40,0.00,'completed','2026-05-09 03:50:14.731','2026-05-09 03:50:14.731',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,254.40,'fb10b8c6-4f5c-4975-b991-c2f69a80d144',NULL,NULL,'pdv',0.00),
('e32f9737-3cff-4b46-86ba-8cb290d520c7',NULL,0.00,0.00,'completed','2026-05-06 04:30:42.715','2026-05-06 04:43:08.434',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('e4880e1b-2222-4f2f-9114-a0b1728bca1b',NULL,4.00,0.00,'completed','2026-05-04 22:24:16.561','2026-05-04 22:24:16.561',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('ebb22756-ba52-452b-bbf4-3d90843e892f',NULL,20.40,0.00,'completed','2026-05-07 16:16:58.135','2026-05-07 16:17:15.511',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,20.40,NULL,NULL,NULL,'pdv',0.00),
('eda39234-bd8f-4c87-be5d-3caf34dc72b8',NULL,7.30,0.00,'completed','2026-05-11 00:30:58.001','2026-05-20 03:33:24.032',NULL,NULL,1,NULL,NULL,NULL,NULL,31,NULL,NULL,1,'nao_emitida',NULL,NULL,7.30,'59f2ce18-eee0-48b8-a174-ad4f83378cd3',NULL,NULL,'pdv',0.00),
('f0d06822-d47e-417f-8be2-67ca50681114',NULL,0.00,0.00,'completed','2026-05-06 04:31:28.701','2026-05-06 04:31:28.701',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('f105ebb6-ca7f-4ab0-adf2-df7a281db51d',NULL,2.00,0.00,'completed','2026-05-08 22:26:30.174','2026-05-08 22:26:30.187',NULL,NULL,1,NULL,NULL,NULL,NULL,13,NULL,NULL,1,'nao_emitida',NULL,NULL,2.00,'3f2cb2a5-8058-4e6c-9e50-6c9585843bdf',NULL,NULL,'pdv',0.00),
('f270ced3-015d-491a-b7b8-188a2c1a03f7',NULL,8.50,0.00,'completed','2026-05-08 22:37:00.683','2026-05-08 22:37:08.558',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,8.50,'a2d561cb-bb0a-4076-be99-e7dea9a197ad',NULL,NULL,'pdv',0.00),
('f8455ad3-c79b-4845-927f-17617374f489',NULL,23.80,0.00,'completed','2026-05-10 22:52:18.210','2026-05-10 22:52:18.210',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,23.80,'f088860a-fae8-4998-b037-407ec9c436bf',NULL,NULL,'pdv',0.00),
('f8552049-ba9c-4738-b970-09d1bf060b29',NULL,95.00,0.00,'completed','2026-04-02 00:49:59.617','2026-04-02 00:49:59.617',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('fbf2871f-da86-4059-b29a-ffc3b59a1ea0',NULL,35.70,0.00,'completed','2026-05-06 04:38:58.590','2026-05-06 04:43:08.580',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.70,NULL,NULL,NULL,'pdv',0.00),
('fcbd3ca9-aa20-498a-ae65-ed2cf93a0511',NULL,17.00,0.00,'completed','2026-05-10 22:03:23.908','2026-05-10 22:06:19.081',NULL,NULL,1,NULL,NULL,NULL,NULL,28,NULL,NULL,1,'nao_emitida',NULL,NULL,17.00,'627aae15-d983-4be8-9176-0b88015dd1d5',NULL,NULL,'pdv',0.00),
('fd06366a-5461-40dd-8866-e2dc6796985e',NULL,263.40,0.00,'completed','2026-04-02 01:05:46.492','2026-04-02 01:05:46.492',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'pdv',0.00),
('ff434345-f49d-40fc-ad2b-422ac308c2aa',NULL,3.50,0.00,'completed','2026-05-06 04:30:14.960','2026-05-06 04:43:08.261',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3.50,NULL,NULL,NULL,'pdv',0.00),
('ff92783c-cf89-4d36-8667-186914e22571',NULL,17.00,0.00,'completed','2026-05-09 03:49:16.216','2026-05-09 03:49:16.240',NULL,NULL,1,NULL,NULL,NULL,NULL,27,NULL,NULL,1,'nao_emitida',NULL,NULL,17.00,'27ca9dd6-cf13-4402-9db4-fab02bf4b295',NULL,NULL,'pdv',0.00);
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
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `hasVariablePricing` tinyint(1) NOT NULL DEFAULT '0',
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
('singleton',1,NULL);
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

-- Dump completed on 2026-06-18  1:27:36
