--
-- PostgreSQL database dump
--

\restrict MM6FBV6LnlNOBepGzTiAClGmoihofx5mPL6iGMe8F8b0otVQMZcMsawb2JgmoSE

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: horas_extras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horas_extras (
    id integer NOT NULL,
    usuario_id integer,
    data_he date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    numero_sa character varying(50) NOT NULL,
    motivo text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_acionamento character varying(100),
    total_horas character varying(20),
    requerente character varying(100),
    status character varying(20) DEFAULT 'Pendente'::character varying,
    data_pagamento timestamp without time zone
);


ALTER TABLE public.horas_extras OWNER TO postgres;

--
-- Name: horas_extras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.horas_extras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.horas_extras_id_seq OWNER TO postgres;

--
-- Name: horas_extras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.horas_extras_id_seq OWNED BY public.horas_extras.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    senha character varying(255) NOT NULL,
    roles text[] NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: horas_extras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_extras ALTER COLUMN id SET DEFAULT nextval('public.horas_extras_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: horas_extras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.horas_extras (id, usuario_id, data_he, hora_inicio, hora_fim, numero_sa, motivo, created_at, tipo_acionamento, total_horas, requerente, status, data_pagamento) FROM stdin;
11	4	2026-08-11	21:00:00	22:00:00	144581	Realizado procedimentos conforme descrito no chamado.	2026-08-12 00:57:15.092765	1 - Sim, estou de sobreaviso	01h 00m	Robson Cunha	Pendente	\N
12	4	2026-08-11	22:00:00	23:00:00	144583	Realizado procedimentos conforme descrito no chamado.	2026-08-12 01:27:44.604925	1 - Sim, estou de sobreaviso	01h 00m	Robson Cunha	Pendente	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nome, email, senha, roles, ativo) FROM stdin;
10	Fabiana Gomes	fgomes@amt.com.br	123	{rh}	t
9	Thiago Costa	tcosta@amt.com.br	1234	{amt}	t
11	Marcello Pignataro	mpignataro@amt.com.br	123	{admin}	t
12	Afonso Pereira	apereira@amt.com.br	123	{amt}	t
13	Robson Cunha	rcunha@amt.com.br	123	{amt}	t
14	Fabio Fontana	ffontana@amt.com.br	123	{externo}	t
15	Rogerio Pousada	rpousada@amt.com.br	123	{externo}	t
16	Claudio Geromel	cgeromel@amt.com.br	123	{amt}	t
17	Erick Silva	esilva@amt.com.br	123	{amt}	t
19	Marcio Lacs	mlacs@amt.com.br	123	{admin}	t
20	Wallace Mendes	wmendes@amt.com.br	123	{admin}	t
21	Nicollas Oliveira	noliveira@amt.com.br	123	{tecnico}	t
22	Nicolas Mesquita	nmesquita@amt.com.br	123	{tecnico}	t
23	Gabriel Rangel	grangel@amt.com.br	123	{tecnico}	t
24	Luiz Freitas	lfreitas@amt.com.br	123	{tecnico}	t
25	Samuel Carvalho	scarvalho@amt.com.br	123	{tecnico}	t
26	Renan Baptista	rbaptista@amt.com.br	123	{tecnico}	t
28	Jonatas Alvarenga	jalvarenga@amt.com.br	123	{tecnico}	t
4	Marcell Correa	mcorrea@amt.com.br	123	{amt,admin}	t
27	Lucas Lima	llima@amt.com.br	123	{tecnico}	t
\.


--
-- Name: horas_extras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.horas_extras_id_seq', 12, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 28, true);


--
-- Name: horas_extras horas_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_extras
    ADD CONSTRAINT horas_extras_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: horas_extras horas_extras_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_extras
    ADD CONSTRAINT horas_extras_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: TABLE horas_extras; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.horas_extras TO usuario_sighe;


--
-- Name: SEQUENCE horas_extras_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.horas_extras_id_seq TO usuario_sighe;


--
-- Name: TABLE usuarios; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usuarios TO usuario_sighe;


--
-- Name: SEQUENCE usuarios_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.usuarios_id_seq TO usuario_sighe;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO usuario_sighe;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO usuario_sighe;


--
-- PostgreSQL database dump complete
--

\unrestrict MM6FBV6LnlNOBepGzTiAClGmoihofx5mPL6iGMe8F8b0otVQMZcMsawb2JgmoSE

