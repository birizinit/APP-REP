-- Quem administra o sistema pode criar contas pela tela Usuarios.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "admin" BOOLEAN NOT NULL DEFAULT false;

-- A conta mais antiga (quem instalou) vira a administradora.
UPDATE "usuarios" SET "admin" = true
WHERE "id" = (SELECT "id" FROM "usuarios" ORDER BY "createdAt" ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "usuarios" WHERE "admin" = true);
