-- Las solicitudes ya no se cancelan ("Rechazar" cumple la misma función):
-- se eliminan las adopciones canceladas y se quita CANCELADA del enum EstadoAdopcion.
-- Todo va en una transacción: si algo falla, no se borra nada.
BEGIN;

-- Las visitas de esas adopciones (si las hubiera) van primero, por la llave foránea
DELETE FROM "visitas_adopcion"
WHERE "adopcionId" IN (SELECT "id" FROM "adopciones" WHERE "estado" = 'CANCELADA');

DELETE FROM "adopciones" WHERE "estado" = 'CANCELADA';

-- AlterEnum: PostgreSQL no permite borrar un valor de un enum, así que se reemplaza el tipo
CREATE TYPE "EstadoAdopcion_new" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA');
ALTER TABLE "adopciones" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "adopciones" ALTER COLUMN "estado" TYPE "EstadoAdopcion_new" USING ("estado"::text::"EstadoAdopcion_new");
ALTER TYPE "EstadoAdopcion" RENAME TO "EstadoAdopcion_old";
ALTER TYPE "EstadoAdopcion_new" RENAME TO "EstadoAdopcion";
DROP TYPE "EstadoAdopcion_old";
ALTER TABLE "adopciones" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

COMMIT;
