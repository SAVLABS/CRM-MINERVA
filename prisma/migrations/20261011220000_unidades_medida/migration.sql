-- RF-042: unidades de medida configurables (catálogo).
-- El producto pasa de guardar el texto libre `unit` a la referencia `unit_id`.

-- CreateTable
CREATE TABLE `units_of_measure` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_of_measure_name_key`(`name`),
    INDEX `units_of_measure_is_active_name_idx`(`is_active`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Unidades base (ids fijos; el seed las actualiza solo si el administrador no
-- las tocó). Nombres ASCII de propósito: evita problemas de encoding en el SQL.
INSERT INTO `units_of_measure` (id, name, is_active, created_at, updated_at) VALUES
    ('u_unidad', 'UNIDAD', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_servicio', 'SERVICIO', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_hora', 'HORA', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_dia', 'DIA', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_mes', 'MES', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_ano', 'ANO', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_proyecto', 'PROYECTO', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_sesion', 'SESION', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_curso', 'CURSO', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_participante', 'PARTICIPANTE', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_usuario', 'USUARIO', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('u_visita', 'VISITA', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- AlterTable: agregar la referencia antes de tocar datos.
ALTER TABLE `products` ADD COLUMN `unit_id` VARCHAR(191) NULL;

-- Backfill: mapear el texto que ya estaba (`unit`) a la unidad del catálogo.
-- Los valores que no coincidan con una unidad de la lista caen en UNIDAD.
UPDATE `products` p
LEFT JOIN `units_of_measure` u ON u.name = p.`unit`
SET p.unit_id = COALESCE(u.id, 'u_unidad');

-- Ya no se necesita el texto libre.
ALTER TABLE `products` DROP COLUMN `unit`;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;