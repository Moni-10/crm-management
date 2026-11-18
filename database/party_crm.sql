-- MySQL dump 10.13  Distrib 8.0.31, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: party_crm
-- ------------------------------------------------------
-- Server version	8.0.31

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity`
--

DROP TABLE IF EXISTS `activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity` (
  `id` varchar(40) NOT NULL,
  `type` varchar(50) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity`
--

LOCK TABLES `activity` WRITE;
/*!40000 ALTER TABLE `activity` DISABLE KEYS */;
INSERT INTO `activity` VALUES ('id_1792598956798_b5gcn4py7','event','Added event \"Test\"','2026-10-21 16:09:16','2026-10-21 16:09:16'),('id_1792599953343_gxdgsw8pp','quotation','Added quotation \"MMW-2026-011\"','2026-10-21 16:25:53','2026-10-21 16:25:53'),('id_1792599972043_a1bdpmjfd','event','Added event \"Call Balaji Flexi about annual service\"','2026-10-21 16:26:12','2026-10-21 16:26:12'),('id_1792600052244_07t40hgdx','machine','Bulk uploaded 1 machine records','2026-10-21 16:27:32','2026-10-21 16:27:32'),('id_1792600062159_06wgmsha9','quotation','Deleted quotation \"MMW-2026-011\"','2026-10-21 16:27:42','2026-10-21 16:27:42'),('id_1792600062206_d2a3hsoib','machine','Deleted machine \"Test Lamination\"','2026-10-21 16:27:42','2026-10-21 16:27:42'),('id_1792600062233_2zwz78dxz','event','Deleted event \"Call Balaji Flexi about annual service\"','2026-10-21 16:27:42','2026-10-21 16:27:42'),('id_1792600062253_duypdt8ed','event','Deleted event \"Test\"','2026-10-21 16:27:42','2026-10-21 16:27:42'),('id_1792600547532_y5d11i0y3','system','Company details updated by Admin','2026-10-21 16:35:47','2026-10-21 16:35:47'),('id_1792600577562_vnd3o8af0','system','Company details updated by Admin','2026-10-21 16:36:17','2026-10-21 16:36:17'),('id_1792601211048_gdsejbx0i','party','Added party \"Zeta Test Co\"','2026-10-21 16:46:51','2026-10-21 16:46:51'),('id_1792601211065_0tzgv6blq','machine','Added machine \"Test Press\"','2026-10-21 16:46:51','2026-10-21 16:46:51'),('id_1792601225205_a2nnvf2ae','salesperson','Added salesperson \"Photo Test\"','2026-10-21 16:47:05','2026-10-21 16:47:05'),('id_1792601238145_mysw90fsc','party','Deleted party \"Zeta Test Co\"','2026-10-21 16:47:18','2026-10-21 16:47:18'),('id_1792601238182_yv0d3k2bd','salesperson','Deleted salesperson \"Photo Test\"','2026-10-21 16:47:18','2026-10-21 16:47:18');
/*!40000 ALTER TABLE `activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company` (
  `id` tinyint NOT NULL,
  `name` varchar(200) NOT NULL,
  `short_name` varchar(20) NOT NULL DEFAULT '',
  `tagline` text,
  `address` text,
  `phones` text,
  `email` varchar(150) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  `gstin` varchar(30) DEFAULT NULL,
  `iec` varchar(30) DEFAULT NULL,
  `logo` mediumtext,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company`
--

LOCK TABLES `company` WRITE;
/*!40000 ALTER TABLE `company` DISABLE KEYS */;
INSERT INTO `company` VALUES (1,'Mohindra Mechanical Works','MMW','Manufacturers of Export Quality :\nPAPER CONVERSION MACHINES & PRINTING MACHINES','UNIT-1, RZ-73, NARSINGH GARDEN, NEW DELHI-18\n(NEAR KHYALA VILLAGE)\nUNIT-II, B-143, Sector-1, DSIIDC, Bawana\nIndl. Area, New delhi-110039','(O) Telefax : 011-25981351\nCell No. : 9312944733\n9999778804\n9999984314','info@mohindraroto.com','www.mohindraroto.com','07AFOPB9017R1ZU','0596068743',NULL,'2026-10-21 16:36:17');
/*!40000 ALTER TABLE `company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` varchar(40) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `event_type` varchar(30) NOT NULL DEFAULT 'meeting',
  `status` varchar(30) NOT NULL DEFAULT 'scheduled',
  `party_id` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `event_time` varchar(5) DEFAULT NULL,
  `salesperson_id` varchar(40) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_event_date` (`date`),
  KEY `fk_event_party` (`party_id`),
  CONSTRAINT `fk_event_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES ('id_1792598337402_i62occscu','Call Shree Packaging about annual service','2026-10-22','followup','scheduled','id_1792598337121_5egsi1ccp','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337407_4dgm7f3qy','Demo at Jai Mata Di Packers','2026-10-24','meeting','scheduled','id_1792598337145_nngxon19t','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337412_a90hyhpwc','Send revised quotation to Raj Enterprises','2026-10-25','followup','scheduled','id_1792598337168_znsl4loda','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337415_9a0j0sbge','Machine inspection - Vardhman Converters','2026-10-27','visit','scheduled','id_1792598337172_vm3c0wghp','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337418_6pdp9gzl6','Trade fair - Delhi Pragati Maidan','2026-10-31','meeting','scheduled',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337421_tx8x6tn5u','Payment follow-up: Balaji Flexi Films','2026-10-23','followup','scheduled','id_1792598337130_17hdcye9v','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337424_gb4pj64tw','Commissioning at Sai Flexo Pack','2026-10-29','visit','scheduled','id_1792598337158_26d4vau2u','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337428_t9uij5jk6','Weekly sales review','2026-10-21','meeting','scheduled',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machines` (
  `id` varchar(40) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `purchase_date` date DEFAULT NULL,
  `party_id` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `purchase_status` varchar(20) NOT NULL DEFAULT 'Purchased',
  PRIMARY KEY (`id`),
  KEY `idx_machine_party` (`party_id`),
  CONSTRAINT `fk_machine_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machines`
--

LOCK TABLES `machines` WRITE;
/*!40000 ALTER TABLE `machines` DISABLE KEYS */;
INSERT INTO `machines` VALUES ('id_1792598337255_3b6gur6dl','Rotogravure Printing Machine','Printing','RG-8C',1,'2024-03-12','id_1792598337121_5egsi1ccp','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337262_3h57rpwxe','Slitter Rewinder','Converting','SR-1000',1,'2024-03-12','id_1792598337121_5egsi1ccp','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337272_t2hd0v5ha','Flexo Printing Machine','Printing','FX-6C',1,'2023-11-05','id_1792598337130_17hdcye9v','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337279_hyzena9qe','Lamination Machine','Converting','LM-1100',1,'2022-08-20','id_1792598337135_vgkhwawl4','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337283_mc346yo8i','Rotogravure Printing Machine','Printing','RG-10C',1,'2025-01-18','id_1792598337139_51qh8m077','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337287_jh8gp6cb2','Pouch Making Machine','Converting','PM-400',2,'2024-07-02','id_1792598337151_btfe8fzz6','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337292_4aksrbw43','Solventless Laminator','Converting','SL-1300',1,'2025-04-09','id_1792598337155_r16gyywe3','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337298_trjqd9apc','Flexo Printing Machine','Printing','FX-8C',1,'2024-10-27','id_1792598337158_26d4vau2u','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337301_efmz3qntl','Slitter Rewinder','Converting','SR-1300',1,'2023-05-14','id_1792598337162_6660iyega','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337304_9xiwlf2fb','Extrusion Coating Plant','Coating','EC-1200',1,'2022-12-01','id_1792598337172_vm3c0wghp','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337307_orefhy5c2','Rotogravure Printing Machine','Printing','RG-8C',2,'2025-06-30','id_1792598337183_f808gco44','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337311_7i51f9vq6','Pouch Making Machine','Converting','PM-600',1,'2024-02-22','id_1792598337194_804smd1v7','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337314_2nwcani4y','Flexo Printing Machine','Printing','FX-4C',1,'2023-09-09','id_1792598337199_cqij1436t','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337317_bi7k5kzg7','Lamination Machine','Converting','LM-900',1,'2024-12-12','id_1792598337203_3uq49unsu','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337321_eaa6ddxmj','Slitter Rewinder','Converting','SR-1000',1,'2025-02-03','id_1792598337207_quvib3h66','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337324_ydil9gw24','Rotogravure Printing Machine','Printing','RG-6C',1,'2023-06-25','id_1792598337212_6e1g5vofh','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337328_feax1dgxq','Corrugation Plant','Paper','CP-1400',1,'2022-04-18','id_1792598337217_o9pozbyma','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337331_l87jh90dk','Bag Making Machine','Converting','BM-250',1,'2025-08-14','id_1792598337232_mrq6r2guw','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337334_jbzsfzqp5','Flexo Printing Machine','Printing','FX-6C',1,'2025-09-21','id_1792598337242_3bllu41z6','2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337337_2qtmgm9uu','Slitter Rewinder','Converting','SR-1300',3,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337340_7s486vwg4','Rotogravure Printing Machine','Printing','RG-8C',1,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased'),('id_1792598337344_nlk64muiu','Pouch Making Machine','Converting','PM-400',2,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','Purchased');
/*!40000 ALTER TABLE `machines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parties`
--

DROP TABLE IF EXISTS `parties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parties` (
  `id` varchar(40) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `party_name` varchar(150) NOT NULL,
  `party_nickname` varchar(100) DEFAULT NULL,
  `primary_mobile` varchar(20) NOT NULL,
  `alternative_mobile` varchar(20) DEFAULT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `party_type` varchar(30) NOT NULL DEFAULT 'Customer',
  `assigned_salesperson` varchar(40) DEFAULT NULL,
  `party_status` varchar(30) NOT NULL DEFAULT 'Active',
  `follow_up_date` date DEFAULT NULL,
  `full_address` text,
  `area` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `location_name` varchar(200) DEFAULT NULL,
  `maps_url` text,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `client_requirements` text,
  `remarks` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'India',
  `alternative_names` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_party_company` (`company_name`),
  KEY `idx_party_mobile` (`primary_mobile`),
  KEY `idx_party_city` (`city`),
  KEY `fk_party_salesperson` (`assigned_salesperson`),
  CONSTRAINT `fk_party_salesperson` FOREIGN KEY (`assigned_salesperson`) REFERENCES `salespersons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parties`
--

LOCK TABLES `parties` WRITE;
/*!40000 ALTER TABLE `parties` DISABLE KEYS */;
INSERT INTO `parties` VALUES ('id_1792598337121_5egsi1ccp','Shree Packaging Pvt Ltd','Sunil Gupta',NULL,'9811122233',NULL,'9811122233','sunil@shree.example.com','Customer','id_1792598337088_oqsbpi18y','Active',NULL,'Sahibabad Industrial Area, Ghaziabad - 201009','Sahibabad Industrial Area','Ghaziabad',NULL,'Uttar Pradesh','201009',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337130_17hdcye9v','Balaji Flexi Films','Mahesh Agarwal',NULL,'9811122234',NULL,'9811122234','mahesh@balaji.example.com','Customer','id_1792598337088_oqsbpi18y','Active',NULL,'Sector 63, Noida - 201305','Sector 63','Noida',NULL,'Uttar Pradesh','201305',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337135_vgkhwawl4','Om Polymers','Deepak Jain',NULL,'9811122235',NULL,'9811122235','deepak@om.example.com','Customer','id_1792598337088_oqsbpi18y','Active',NULL,'NIT Industrial Area, Faridabad - 121003','NIT Industrial Area','Faridabad',NULL,'Haryana','121003',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337139_51qh8m077','Gupta Roto Print','Anil Gupta',NULL,'9811122236',NULL,'9811122236','anil@gupta.example.com','Customer','id_1792598337099_zoclr6vzg','Active',NULL,'Mundka, Delhi - 110041','Mundka','Delhi',NULL,'Delhi','110041',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337145_nngxon19t','Jai Mata Di Packers','Rakesh Kumar',NULL,'9811122237',NULL,'9811122237','rakesh@jai.example.com','Prospect','id_1792598337099_zoclr6vzg','Follow-up','2026-10-27','Jhilmil, Delhi - 110095','Jhilmil','Delhi',NULL,'Delhi','110095',NULL,NULL,NULL,NULL,'Looking for a new printing / converting line',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337151_btfe8fzz6','Kailash Industries','Pramod Sharma',NULL,'9811122238',NULL,'9811122238','pramod@kailash.example.com','Customer','id_1792598337099_zoclr6vzg','Active',NULL,'HSIIDC Rai, Sonipat - 131001','HSIIDC Rai','Sonipat',NULL,'Haryana','131001',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337155_r16gyywe3','National Laminators','Faisal Khan',NULL,'9811122239',NULL,'9811122239','faisal@national.example.com','Dealer','id_1792598337105_1nonpo9on','Active',NULL,'Civil Lines, Moradabad - 244001','Civil Lines','Moradabad',NULL,'Uttar Pradesh','244001',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337158_26d4vau2u','Sai Flexo Pack','Nitin Patil',NULL,'9811122240',NULL,'9811122240','nitin@sai.example.com','Customer','id_1792598337105_1nonpo9on','Active',NULL,'Pimpri MIDC, Pune - 411019','Pimpri MIDC','Pune',NULL,'Maharashtra','411019',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337162_6660iyega','Arihant Printers','Mukesh Shah',NULL,'9811122241',NULL,'9811122241','mukesh@arihant.example.com','Customer','id_1792598337105_1nonpo9on','Active',NULL,'Vatva GIDC, Ahmedabad - 382445','Vatva GIDC','Ahmedabad',NULL,'Gujarat','382445',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337168_znsl4loda','Raj Enterprises','Rajesh Mehta',NULL,'9811122242',NULL,'9811122242','rajesh@raj.example.com','Prospect','id_1792598337105_1nonpo9on','Follow-up','2026-10-25','Sachin GIDC, Surat - 395006','Sachin GIDC','Surat',NULL,'Gujarat','395006',NULL,NULL,NULL,NULL,'Looking for a new printing / converting line',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337172_vm3c0wghp','Vardhman Converters','Ashok Singhal',NULL,'9811122243',NULL,'9811122243','ashok@vardhman.example.com','Customer','id_1792598337109_eficw8rdm','Active',NULL,'Focal Point, Ludhiana - 141003','Focal Point','Ludhiana',NULL,'Punjab','141003',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337177_lqs8bnv91','Punjab Packaging Co','Harpreet Singh',NULL,'9811122244',NULL,'9811122244','harpreet@punjab.example.com','Customer','id_1792598337109_eficw8rdm','Inactive',NULL,'Industrial Estate, Jalandhar - 144004','Industrial Estate','Jalandhar',NULL,'Punjab','144004',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337183_f808gco44','Dubai Pack Trading LLC','Mohammed Ali',NULL,'971501234567',NULL,'971501234567','mohammed@dubai.example.com','Distributor','id_1792598337109_eficw8rdm','Active',NULL,'Al Quoz, Dubai','Al Quoz','Dubai',NULL,'UAE',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337188_ezezlohad','Lanka Flexo Pvt Ltd','Nuwan Perera',NULL,'94771234567',NULL,'94771234567','nuwan@lanka.example.com','Prospect','id_1792598337109_eficw8rdm','Follow-up','2026-10-29','Ratmalana, Colombo','Ratmalana','Colombo',NULL,'Sri Lanka',NULL,NULL,NULL,NULL,NULL,'Looking for a new printing / converting line',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337194_804smd1v7','Ganesh Poly Pack','Santosh Pawar',NULL,'9811122245',NULL,'9811122245','santosh@ganesh.example.com','Customer','id_1792598337115_6vkd5aj31','Active',NULL,'Ambad MIDC, Nashik - 422010','Ambad MIDC','Nashik',NULL,'Maharashtra','422010',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337199_cqij1436t','Hindustan Labels','Ravi Nair',NULL,'9811122246',NULL,'9811122246','ravi@hindustan.example.com','Customer','id_1792598337115_6vkd5aj31','Active',NULL,'Peenya, Bengaluru - 560058','Peenya','Bengaluru',NULL,'Karnataka','560058',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337203_3uq49unsu','Southern Rotoprint','Murugan S',NULL,'9811122247',NULL,'9811122247','murugan@southern.example.com','Customer','id_1792598337115_6vkd5aj31','Active',NULL,'Ambattur, Chennai - 600058','Ambattur','Chennai',NULL,'Tamil Nadu','600058',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337207_quvib3h66','Eastern Flexi Works','Subrata Das',NULL,'9811122248',NULL,'9811122248','subrata@eastern.example.com','Prospect','id_1792598337118_6khe62ejh','Active',NULL,'Salt Lake, Kolkata - 700091','Salt Lake','Kolkata',NULL,'West Bengal','700091',NULL,NULL,NULL,NULL,'Looking for a new printing / converting line',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337212_6e1g5vofh','Bharat Cartons','Vinod Tiwari',NULL,'9811122249',NULL,'9811122249','vinod@bharat.example.com','Customer','id_1792598337118_6khe62ejh','Active',NULL,'Panki, Kanpur - 208022','Panki','Kanpur',NULL,'Uttar Pradesh','208022',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337217_o9pozbyma','Modern Paper Conversion','Sandeep Bansal',NULL,'9811122250',NULL,'9811122250','sandeep@modern.example.com','Customer','id_1792598337118_6khe62ejh','Active',NULL,'Rampur Road, Bareilly - 243006','Rampur Road','Bareilly',NULL,'Uttar Pradesh','243006',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337225_nihek4riq','Star Wrap Industries','Imran Qureshi',NULL,'9811122251',NULL,'9811122251','imran@star.example.com','Prospect','id_1792598337118_6khe62ejh','Follow-up','2026-10-29','Pithampur, Indore - 452015','Pithampur','Indore',NULL,'Madhya Pradesh','452015',NULL,NULL,NULL,NULL,'Looking for a new printing / converting line',NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337232_mrq6r2guw','Krishna Rotogravure','Dinesh Yadav',NULL,'9811122252',NULL,'9811122252','dinesh@krishna.example.com','Customer','id_1792598337088_oqsbpi18y','Active',NULL,'Sitapura, Jaipur - 302022','Sitapura','Jaipur',NULL,'Rajasthan','302022',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337242_3bllu41z6','Tirupati Pack Solutions','Venkat Reddy',NULL,'9811122253',NULL,'9811122253','venkat@tirupati.example.com','Customer','id_1792598337115_6vkd5aj31','Active',NULL,'Jeedimetla, Hyderabad - 500055','Jeedimetla','Hyderabad',NULL,'Telangana','500055',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL),('id_1792598337249_89micv0v7','Alpha Print & Pack','Gaurav Kapoor',NULL,'9811122254',NULL,'9811122254','gaurav@alpha.example.com','Customer','id_1792598337099_zoclr6vzg','Active',NULL,'Manesar, Gurugram - 122001','Manesar','Gurugram',NULL,'Haryana','122001',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 15:58:57','2026-10-21 15:58:57','India',NULL);
/*!40000 ALTER TABLE `parties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` varchar(40) NOT NULL,
  `position` int NOT NULL DEFAULT '0',
  `machine_name` varchar(200) DEFAULT NULL,
  `machine_model` varchar(100) DEFAULT NULL,
  `specifications` text,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_item_quotation` (`quotation_id`),
  CONSTRAINT `fk_item_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
INSERT INTO `quotation_items` VALUES (5,'id_1792598337347_m4d02ok7n',0,'Rotogravure Printing Machine','RG-8C','8 colour, 1000 mm web width, 150 mpm, unwinder and rewinder',1.00,1200000.00,1200000.00),(6,'id_1792598337347_m4d02ok7n',1,'Slitter Rewinder','SR-1000','Max 1000 mm, 300 mpm',1.00,250000.00,250000.00),(7,'id_1792598337356_qievsq5vr',0,'Flexo Printing Machine','FX-6C','6 colour, 850 mm, ceramic anilox',1.00,950000.00,950000.00),(8,'id_1792598337362_1lp76auq1',0,'Pouch Making Machine','PM-400','Three side seal, servo driven',2.00,420000.00,840000.00),(9,'id_1792598337367_lrkxf2852',0,'Extrusion Coating Plant','EC-1200','1200 mm, with corona treater',1.00,2600000.00,2600000.00),(10,'id_1792598337372_q2ahcx370',0,'Rotogravure Printing Machine','RG-8C','8 colour, export model',2.00,1250000.00,2500000.00),(11,'id_1792598337372_q2ahcx370',1,'Slitter Rewinder','SR-1300','Max 1300 mm',2.00,310000.00,620000.00),(12,'id_1792598337377_2woggevf0',0,'Flexo Printing Machine','FX-4C','4 colour, 650 mm',1.00,680000.00,680000.00),(13,'id_1792598337382_27pw967aw',0,'Lamination Machine','LM-1100','Dry laminator with chiller',1.00,780000.00,780000.00),(14,'id_1792598337382_27pw967aw',1,'Slitter Rewinder','SR-1000','Max 1000 mm',1.00,250000.00,250000.00),(15,'id_1792598337387_lkdqrebm1',0,'Corrugation Plant','CP-1400','1400 mm, 3 ply',1.00,1850000.00,1850000.00),(16,'id_1792598337393_hq0tzy1ue',0,'Bag Making Machine','BM-250','Flat and gusset bags',1.00,540000.00,540000.00),(17,'id_1792598337393_hq0tzy1ue',1,'Pouch Making Machine','PM-600','Stand-up pouch with zipper',1.00,890000.00,890000.00),(18,'id_1792598337398_oc8z3h3me',0,'Solventless Laminator','SL-1300','1300 mm, high speed',1.00,1480000.00,1480000.00);
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` varchar(40) NOT NULL,
  `quotation_number` varchar(50) NOT NULL,
  `quotation_date` date DEFAULT NULL,
  `party_id` varchar(40) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `party_name` varchar(150) DEFAULT NULL,
  `salesperson_name` varchar(150) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `address` text,
  `gst_tax` decimal(6,2) NOT NULL DEFAULT '0.00',
  `payment_terms` text,
  `delivery_terms` text,
  `notes` text,
  `status` varchar(30) NOT NULL DEFAULT 'Draft',
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `validity_date` date DEFAULT NULL,
  `warranty` text,
  `installation_terms` text,
  `bank_details` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quotation_number` (`quotation_number`),
  KEY `idx_quotation_party` (`party_id`),
  CONSTRAINT `fk_quotation_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES ('id_1792598337347_m4d02ok7n','MMW-2026-001','2026-08-12','id_1792598337121_5egsi1ccp','Shree Packaging Pvt Ltd','Sunil Gupta','Rahul Sharma','9811122233','Sahibabad Industrial Area, Ghaziabad - 201009',0.00,'50% advance with order, balance before dispatch','Within 45 days from receipt of advance',NULL,'Approved',1450000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337356_qievsq5vr','MMW-2026-002','2026-08-27','id_1792598337145_nngxon19t','Jai Mata Di Packers','Rakesh Kumar','Amit Verma','9811122237','Jhilmil, Delhi - 110095',0.00,'40% advance, 50% on readiness, 10% after commissioning','60 days',NULL,'Sent',950000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337362_1lp76auq1','MMW-2026-003','2026-09-11','id_1792598337168_znsl4loda','Raj Enterprises','Rajesh Mehta','Priya Singh','9811122242','Sachin GIDC, Surat - 395006',0.00,'100% advance','30 days',NULL,'Draft',840000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337367_lrkxf2852','MMW-2026-004','2026-09-18','id_1792598337172_vm3c0wghp','Vardhman Converters','Ashok Singhal','Karan Malhotra','9811122243','Focal Point, Ludhiana - 141003',0.00,'30% advance, 60% against PI, 10% after installation','90 days',NULL,'Approved',2600000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337372_q2ahcx370','MMW-2026-005','2026-09-26','id_1792598337183_f808gco44','Dubai Pack Trading LLC','Mohammed Ali','Karan Malhotra','971501234567','Al Quoz, Dubai',0.00,'30% advance by TT, balance against BL copy','75 days from advance',NULL,'Sent',3120000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337377_2woggevf0','MMW-2026-006','2026-10-03','id_1792598337188_ezezlohad','Lanka Flexo Pvt Ltd','Nuwan Perera','Karan Malhotra','94771234567','Ratmalana, Colombo',0.00,'50% advance, balance before dispatch','45 days',NULL,'Sent',680000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337382_27pw967aw','MMW-2026-007','2026-10-12','id_1792598337207_quvib3h66','Eastern Flexi Works','Subrata Das','Vikram Chauhan','9811122248','Salt Lake, Kolkata - 700091',0.00,'50% advance, balance before dispatch','40 days',NULL,'Draft',1030000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337387_lkdqrebm1','MMW-2026-008','2026-10-15','id_1792598337225_nihek4riq','Star Wrap Industries','Imran Qureshi','Vikram Chauhan','9811122251','Pithampur, Indore - 452015',0.00,'30% advance, balance in two instalments','100 days',NULL,'Rejected',1850000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337393_hq0tzy1ue','MMW-2026-009','2026-10-18','id_1792598337242_3bllu41z6','Tirupati Pack Solutions','Venkat Reddy','Sunita Rao','9811122253','Jeedimetla, Hyderabad - 500055',0.00,'50% advance, balance before dispatch','50 days',NULL,'Sent',1430000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL),('id_1792598337398_oc8z3h3me','MMW-2026-010','2026-10-20','id_1792598337135_vgkhwawl4','Om Polymers','Deepak Jain','Rahul Sharma','9811122235','NIT Industrial Area, Faridabad - 121003',0.00,'40% advance, balance before dispatch','60 days',NULL,'Draft',1480000.00,'2026-10-21 15:58:57','2026-10-21 15:58:57',0.00,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salespersons`
--

DROP TABLE IF EXISTS `salespersons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salespersons` (
  `id` varchar(40) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `notes` text,
  `whatsapp` varchar(20) DEFAULT NULL,
  `photo` mediumtext,
  PRIMARY KEY (`id`),
  KEY `idx_sp_name` (`full_name`),
  KEY `idx_sp_mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salespersons`
--

LOCK TABLES `salespersons` WRITE;
/*!40000 ALTER TABLE `salespersons` DISABLE KEYS */;
INSERT INTO `salespersons` VALUES ('id_1792598337088_oqsbpi18y','Rahul Sharma','Rahul','9810011001','rahul@mmw.in','Sales','EMP001','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337099_zoclr6vzg','Amit Verma','Amit','9810011002','amit@mmw.in','Sales','EMP002','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337105_1nonpo9on','Priya Singh','Priya','9810011003','priya@mmw.in','Sales','EMP003','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337109_eficw8rdm','Karan Malhotra','Karan','9810011004','karan@mmw.in','Export Sales','EMP004','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337115_6vkd5aj31','Sunita Rao','Sunita','9810011005','sunita@mmw.in','Service','EMP005','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL),('id_1792598337118_6khe62ejh','Vikram Chauhan','Vikky','9810011006','vikram@mmw.in','Sales','EMP006','2026-10-21 15:58:57','2026-10-21 15:58:57',NULL,NULL,NULL);
/*!40000 ALTER TABLE `salespersons` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 22:20:51
