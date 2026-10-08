# Flujo del emprendedor

Registro del negocio, panel con sus pestañas, actividades con sello y QR, reseñas y editor de diseño.
Imagen: [`diagrama_flujo_emprendedor.png`](diagrama_flujo_emprendedor.png).

```mermaid
flowchart TD
  A(["Inicia sesión<br/>y elige Emprendedor<br/>(o Menú → Mi negocio)"]) --> R["Registra tu negocio<br/>nombre · categoría · responsable<br/>≥ 3 fotos · ubicación"]
  R -->|"insert negocio<br/>estado = pendiente"| W["3 pantallas de bienvenida<br/>del emprendedor"]
  W --> PEN["Registro enviado<br/>en revisión"]
  PEN --> ADM{"Administrador"}
  ADM -->|"admin_rechazar_negocio<br/>(con motivo)"| REC["Rechazado<br/>ve el motivo"]
  REC -->|"Corregir"| R
  ADM -->|"admin_aprobar_negocio<br/>suscripción 6 meses"| ACT["Negocio activo"]

  ACT --> PAN["Panel del emprendedor<br/>Menú → Mi negocio"]
  PAN --> T1["Resumen<br/>accesos rápidos"]
  PAN --> T2["Mi negocio<br/>perfil · horarios · ubicación<br/>productos · fotos (máx. 10)"]
  PAN --> T3["Actividades y Cupones"]
  PAN --> T4["Reseñas"]
  PAN --> T5["Diseño"]
  PAN --> VER["Ver como te ven los turistas"]
  PAN --> VEN{"¿Suscripción vencida?"}
  VEN -->|"Sí"| WA["Deja de verse en público<br/>botón WhatsApp para renovar"]
  WA -.->|"admin_renovar_suscripcion"| ACT

  T3 --> N1["Nueva actividad<br/>nombre · descripción ≥ 20 · foto<br/>categoría · lugar · fechas y horas"]
  N1 -->|"crear_evento_desde_actividad"| EVT["Se publica en Eventos<br/>desaparece al terminar"]
  N1 --> Q{"¿Solicita sello?"}
  Q -->|"No"| EVT
  Q -->|"Sí: justificación +<br/>límite de canjes"| REV["estado_sello = pendiente<br/>En revisión"]
  REV --> AD2{"Administrador"}
  AD2 -->|"admin_rechazar_sello<br/>(motivo)"| RR["Rechazado<br/>puede pedirlo de nuevo"]
  RR --> REV
  AD2 -->|"admin_aprobar_sello"| QRN["Se crea el qr_sello<br/>(token, vence al terminar)"]
  QRN --> MQ["El negocio muestra el QR<br/>en su local"]
  MQ --> TUR["El turista escanea<br/>canjear_qr_sello → sello"]
  TUR --> ENT["Contador de sellos entregados<br/>sellos_entregados_por_actividad"]
  N1 --> ED["Editar / eliminar actividad<br/>eliminar_actividad"]

  T3 --> CU["Crear cupón<br/>% descuento · vencimiento · límite"]
  CU --> CQ["QR del cupón + QR de canje del negocio"]

  T4 --> RV1["Promedio, desglose por estrellas<br/>y lista de reseñas"]
  RV1 --> RV2["Responder reseña<br/>responder_resena"]
  TUR --> PR["Con sello, el turista puede reseñar"]
  PR --> RV1

  T5 --> D1["Paleta (8) · letra (3)"]
  T5 --> D2["Portada y logo<br/>bucket negocios"]
  T5 --> D3["Descripción (300) · WhatsApp"]
  T5 --> D4["Secciones visibles y su orden<br/>cuadrícula o lista de productos"]
  D1 --> D5["Vista previa en vivo"]
  D2 --> D5
  D3 --> D5
  D4 --> D5
  D5 -->|"update negocio.config_diseno<br/>(validado por la base)"| FICHA["Ficha pública del negocio"]
```
