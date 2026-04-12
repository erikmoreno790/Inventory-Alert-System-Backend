-- =====================================================
-- Migración: Sistema de Notificaciones WhatsApp
-- Fecha: 2026-04-10
-- =====================================================

-- 1. Agregar columna stock_minimo a repuestos
-- El valor por defecto (5) coincide con el umbral hardcodeado anterior
ALTER TABLE repuestos 
ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 5;

-- 2. Agregar columna whatsapp_enviado a alertas
-- Rastrea si ya se envió notificación WhatsApp para esta alerta
-- Cuando el stock se normaliza, la alerta se elimina y el tracking se resetea
ALTER TABLE alertas 
ADD COLUMN IF NOT EXISTS whatsapp_enviado BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================
-- Verificación (ejecutar después de la migración)
-- =====================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'repuestos' AND column_name = 'stock_minimo';
--
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'alertas' AND column_name = 'whatsapp_enviado';
