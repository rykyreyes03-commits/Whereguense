# Sistema de sellos, niveles y accesorios

Sitio → rango (cobre/plata/oro) → puntos del sello → puntos totales → nivel → recompensas.
Imagen: [`diagrama_sistema_sellos.png`](diagrama_sistema_sellos.png).

```mermaid
flowchart LR
  subgraph SIT["1. Sitio y su rango (sitio.rango)"]
    R1["COBRE<br/>46 sitios"]
    R2["PLATA<br/>7 sitios<br/>museos, universidad, fortaleza"]
    R3["ORO<br/>7 sitios<br/>Ruta Dariana, Catedral, León Viejo"]
  end

  subgraph SEL["2. Sello → puntos (valor_sello)"]
    P1["1 punto"]
    P2["0.5 puntos"]
    P3["2 puntos"]
    PQ["Sello por QR de negocio<br/>= 1 punto (cobre)"]
  end

  R1 --> P1
  R2 --> P2
  R3 --> P3

  GEO["Sello por geolocalización<br/>sellar_por_geolocalizacion"] --> SEL
  QRS["Sello por QR<br/>canjear_qr_sello"] --> PQ

  P1 --> TOT
  P2 --> TOT
  P3 --> TOT
  PQ --> TOT

  TOT["3. Puntos totales<br/>calcular_nivel(usuario)<br/>suma los puntos de sus sellos"] --> FORM

  FORM["4. Nivel N<br/>puntos acumulados = N · (N − 1)<br/>subir de N a N+1 cuesta 2 · N"]
  FORM --> TAB["Nivel 1 → 0 pts<br/>Nivel 2 → 2 · Nivel 3 → 6<br/>Nivel 4 → 12 · Nivel 5 → 20<br/>Nivel 10 → 90"]

  FORM --> H{"5. ¿Nivel múltiplo de 5?<br/>5, 10, 15…"}
  H -->|"Sí"| PZ["Elige 1 de 3 piezas al azar<br/>pieza_desbloqueada<br/>→ se equipa en Avatar"]
  H -->|"No"| NADA["Sigue acumulando"]

  FORM --> ACC

  subgraph ACC["accesorio_avatar (por nivel_requerido)"]
    A1["Nivel 5<br/>Sombrero de Palma"]
    A2["Nivel 10<br/>Bufanda Dariana"]
    A3["Nivel 20<br/>Máscara del Güegüense"]
    A4["Nivel 30<br/>Corona de Maestro"]
  end

  ACC --> TI["accesorios_desbloqueados(usuario)<br/>hoy solo se ve en la Tienda<br/>(lista con candado)"]

  FORM -.-> RV["Título del viajero (por cantidad de sellos)<br/>Principiante &lt; 5 · Explorador ≥ 5 · Maestro Güegüense ≥ 8"]
```
