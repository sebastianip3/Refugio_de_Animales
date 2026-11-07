ALTER TABLE "cuentas"
    ALTER COLUMN "disponibleCuidado" SET DEFAULT true;

CREATE FUNCTION normalizar_disponibilidad_cuidado_cuenta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."tipo" = 'VOLUNTARIO' THEN
        IF NEW."disponibleCuidado" IS NULL THEN
            NEW."disponibleCuidado" := true;
        END IF;
    ELSE
        NEW."disponibleCuidado" := NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "cuentas_normalizar_disponibilidad_cuidado"
    BEFORE INSERT OR UPDATE ON "cuentas"
    FOR EACH ROW
    EXECUTE FUNCTION normalizar_disponibilidad_cuidado_cuenta();
