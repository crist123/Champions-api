create SCHEMA `champions` ;

use champions;
CREATE TABLE IF NOT EXISTS users (
  id char(36) NOT NULL,
  name varchar(255) NOT NULL,
  lastname varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  password varchar(255) DEFAULT NULL,
  document_type varchar(45) DEFAULT NULL,
  document_number varchar(45) DEFAULT NULL,
  mobile_phone varchar(255) DEFAULT NULL,
  status tinyint(1) DEFAULT '1',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  modified_by varchar(45) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE(email)
);
CREATE TABLE IF NOT EXISTS roles (
  id char(36) NOT NULL,
  role varchar(100) NOT NULL,
  description varchar(250) NOT NULL,
  name varchar(45) DEFAULT NULL,
  modified_by varchar(100) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS role_users (
  id char(36) NOT NULL,
  user_id char(36) NOT NULL,
  role_id char(36) NOT NULL,
  modified_by varchar(45) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO `users` VALUES ('65b0bf44-3481-4102-907e-3b2da3bf99f7','Admin','Champion','admin@gmail.com','U2FsdGVkX1+ZH/ruP++l4WU9l+QAPRlf4bs1yLgB1RA=',NULL,NULL,'3502357362',1,'2020-09-13 21:04:32','2020-09-13 21:34:40','65b0bf44-3481-4102-907e-3b2da3bf99f7');
INSERT INTO `role` VALUES ('78dde660-78af-46c2-817f-75399fb3f7a4','admin','Admin','Admin',NULL,'2020-09-13 20:59:09','2020-09-13 20:59:09'),('78dde660-78af-46c2-817f-75399fb3f7a5','client','Cliente','Cliente',NULL,'2020-09-13 20:59:09','2020-09-13 20:59:09');
INSERT INTO `role_users` VALUES ('eb9df32d-1fbe-4a9f-a11a-fcb6cab0b010','65b0bf44-3481-4102-907e-3b2da3bf99f7','78dde660-78af-46c2-817f-75399fb3f7a4','65b0bf44-3481-4102-907e-3b2da3bf99f7','2020-09-13 21:04:32','2020-09-13 21:04:32');