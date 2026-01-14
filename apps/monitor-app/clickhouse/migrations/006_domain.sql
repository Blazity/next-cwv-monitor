ALTER TABLE projects 
RENAME COLUMN slug TO domain;

ALTER TABLE projects 
UPDATE domain = '*' 
WHERE domain NOT LIKE '%.%';