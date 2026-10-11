CREATE TABLE `roles` (`id` VARCHAR(191) NOT NULL, `name` VARCHAR(100) NOT NULL, `description` VARCHAR(255) NULL, `is_system` BOOLEAN NOT NULL DEFAULT false, `is_admin` BOOLEAN NOT NULL DEFAULT false, `is_active` BOOLEAN NOT NULL DEFAULT true, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL, UNIQUE INDEX `roles_name_key`(`name`), INDEX `roles_is_system_is_active_idx`(`is_system`, `is_active`), PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `role_permissions` (`id` VARCHAR(191) NOT NULL, `role_id` VARCHAR(191) NOT NULL, `permission` VARCHAR(60) NOT NULL, INDEX `role_permissions_permission_idx`(`permission`), UNIQUE INDEX `role_permissions_role_id_permission_key`(`role_id`, `permission`), PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insertar los tres roles de fabrica (RF-009).
INSERT INTO `roles` (`id`,`name`,`description`,`is_system`,`is_admin`,`is_active`,`updated_at`) VALUES ('r_def_admin', 'Administrador', 'Acceso total al sistema y administracion de usuarios y roles.', 1, 1, 1, NOW());
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p0', 'r_def_admin', 'clients:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p1', 'r_def_admin', 'clients:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p2', 'r_def_admin', 'contacts:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p3', 'r_def_admin', 'contacts:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p4', 'r_def_admin', 'products:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p5', 'r_def_admin', 'products:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p6', 'r_def_admin', 'opportunities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p7', 'r_def_admin', 'opportunities:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p8', 'r_def_admin', 'activities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p9', 'r_def_admin', 'activities:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p10', 'r_def_admin', 'quotations:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p11', 'r_def_admin', 'quotations:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p12', 'r_def_admin', 'stages:manage');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p13', 'r_def_admin', 'activityTypes:manage');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p14', 'r_def_admin', 'settings:manage');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p15', 'r_def_admin', 'users:manage');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p16', 'r_def_admin', 'reports:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_admin_p17', 'r_def_admin', 'audit:read');
INSERT INTO `roles` (`id`,`name`,`description`,`is_system`,`is_admin`,`is_active`,`updated_at`) VALUES ('r_def_comercial', 'Comercial', 'Operacion comercial: clientes, contactos, oportunidades, actividades y cotizaciones.', 1, 0, 1, NOW());
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p0', 'r_def_comercial', 'clients:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p1', 'r_def_comercial', 'contacts:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p2', 'r_def_comercial', 'products:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p3', 'r_def_comercial', 'opportunities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p4', 'r_def_comercial', 'activities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p5', 'r_def_comercial', 'quotations:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p6', 'r_def_comercial', 'reports:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p7', 'r_def_comercial', 'clients:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p8', 'r_def_comercial', 'contacts:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p9', 'r_def_comercial', 'opportunities:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p10', 'r_def_comercial', 'activities:write');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_comercial_p11', 'r_def_comercial', 'quotations:write');
INSERT INTO `roles` (`id`,`name`,`description`,`is_system`,`is_admin`,`is_active`,`updated_at`) VALUES ('r_def_consulta', 'Consulta', 'Solo lectura de la informacion y reportes.', 1, 0, 1, NOW());
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p0', 'r_def_consulta', 'clients:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p1', 'r_def_consulta', 'contacts:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p2', 'r_def_consulta', 'products:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p3', 'r_def_consulta', 'opportunities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p4', 'r_def_consulta', 'activities:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p5', 'r_def_consulta', 'quotations:read');
INSERT INTO `role_permissions` (`id`,`role_id`,`permission`) VALUES ('r_def_consulta_p6', 'r_def_consulta', 'reports:read');

-- Reubicar los usuarios existentes: del enum a role_id.
ALTER TABLE `users` ADD COLUMN `role_id` VARCHAR(191) NULL;
UPDATE `users` SET `role_id` = 'r_def_admin' WHERE `role` = 'ADMIN';
UPDATE `users` SET `role_id` = 'r_def_comercial' WHERE `role` = 'COMERCIAL';
UPDATE `users` SET `role_id` = 'r_def_consulta' WHERE `role` = 'CONSULTA';
UPDATE `users` SET `role_id` = 'r_def_consulta' WHERE `role_id` IS NULL;
ALTER TABLE `users` MODIFY COLUMN `role_id` VARCHAR(191) NOT NULL;
DROP INDEX `users_role_is_active_idx` ON `users`;
ALTER TABLE `users` DROP COLUMN `role`;
CREATE INDEX `users_role_id_is_active_idx` ON `users`(`role_id`, `is_active`);
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Los tres roles reemplazan al enum que ya existia; no hay perdida de datos.
