ALTER TABLE user
ADD COLUMN role Enum8('member' = 1, 'admin' = 2) DEFAULT 'member';