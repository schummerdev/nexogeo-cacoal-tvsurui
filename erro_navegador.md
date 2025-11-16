Columns
Add column
id
SERIAL
PRIMARY KEY
promocao_id
INTEGER
NOT NULL
nome
VARCHAR(255)
NOT NULL
telefone
VARCHAR(20)
NOT NULL
bairro
VARCHAR(255)
cidade
VARCHAR(255)
latitude
NUMERIC(10,8)
longitude
NUMERIC(11,8)
origem_source
VARCHAR(100)
origem_medium
VARCHAR(100)
participou_em
TIMESTAMP WITH TIME ZONE
DEFAULT'CURRENT_TIMESTAMP'
origem
VARCHAR(50)
DEFAULT''formulario''
email
VARCHAR(255)
deleted_at
TIMESTAMP WITH TIME ZONE

deleted_by
INTEGER






Columns
Add column
id
SERIAL
PRIMARY KEY
promocao_id
INTEGER
NOT NULL
nome
VARCHAR(255)
NOT NULL
telefone
VARCHAR(20)
NOT NULL
bairro
VARCHAR(255)
cidade
VARCHAR(255)
latitude
NUMERIC(10, 8)
longitude
NUMERIC(11, 8)
origem_source
VARCHAR(100)
origem_medium
VARCHAR(100)
participou_em
TIMESTAMP WITH TIME ZONE
DEFAULTCURRENT_TIMESTAMP
origem
VARCHAR(50)
DEFAULT'formulario'
email
VARCHAR(255)
deleted_at
TIMESTAMP

deleted_by
INTEGER




compare essas 2 estruturas de tabelas tem alguma divergencia? 


