-- Un número de chip identifica a un solo animal (varios animales pueden no tener chip)
CREATE UNIQUE INDEX "animales_numeroChip_key" ON "animales"("numeroChip");