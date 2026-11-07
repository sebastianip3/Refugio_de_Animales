ALTER TABLE "cuentas"
    ADD COLUMN "disponibleCuidado" BOOLEAN;

UPDATE "cuentas"
SET "disponibleCuidado" = CASE
    WHEN "tipo" = 'VOLUNTARIO' THEN true
    ELSE NULL
END;

ALTER TABLE "cuentas"
    ALTER COLUMN "disponibleCuidado" SET DEFAULT true;

ALTER TABLE "cuentas"
    ADD CONSTRAINT "cuentas_disponibilidad_cuidado_tipo_check"
    CHECK (
        ("tipo" = 'VOLUNTARIO' AND "disponibleCuidado" IS NOT NULL)
        OR
        ("tipo" <> 'VOLUNTARIO' AND "disponibleCuidado" IS NULL)
    );

CREATE INDEX "cuentas_tipo_disponibleCuidado_idx"
    ON "cuentas"("tipo", "disponibleCuidado");

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
