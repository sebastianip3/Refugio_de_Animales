ALTER TABLE "cuentas"
    ADD COLUMN "disponibleCuidado" BOOLEAN;

UPDATE "cuentas"
SET "disponibleCuidado" = CASE
    WHEN "tipo" = 'VOLUNTARIO' THEN true
    ELSE NULL
END;

ALTER TABLE "cuentas"
    ADD CONSTRAINT "cuentas_disponibilidad_cuidado_tipo_check"
    CHECK (
        ("tipo" = 'VOLUNTARIO' AND "disponibleCuidado" IS NOT NULL)
        OR
        ("tipo" <> 'VOLUNTARIO' AND "disponibleCuidado" IS NULL)
    );

CREATE INDEX "cuentas_tipo_disponibleCuidado_idx"
    ON "cuentas"("tipo", "disponibleCuidado");
