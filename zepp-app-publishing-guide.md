# Guía para Publicar una App en Zepp OS

> Fuente: [Zepp OS Developers Documentation - How to submit an App](https://docs.zepp.com/docs/distribute/)

## 1. Registro previo

- **Cuenta de desarrollador**: Regístrate en el [portal de desarrolladores de Zepp](https://developer.zepp.com/) y accede a la [Developer Console](https://console.zepp.com/)
- **Crear la app**: En la lista de aplicaciones, selecciona **Create App**, ingresa el nombre y obtén el **AppId** único
- **Configurar el AppId**: Debes incluirlo en tu `app.json` durante el desarrollo:

```json
{
  "app": {
    "appId": 123456
  }
}
```

## 2. Preparar el paquete y assets

- **Paquete ZAB**: Compila tu app con Zeus CLI (`zeus build`) generando el archivo `.zab`. El AppId dentro del paquete debe coincidir exactamente con el registrado.
- **Icono**: 240×240 px, PNG, fondo transparente, forma circular (sin márgenes alrededor del icono)
- **Screenshots**: Mínimo 3 imágenes recomendadas de 360×360 px, PNG, fondo transparente:
  - **Pantallas redondas**: screenshot centrado sin márgenes
  - **Pantallas rectangulares**: márgenes iguales a izquierda/derecha, sin márgenes arriba/abajo
- **Política de privacidad**: Texto completo explicando cómo recopilas, usas y compartes datos del usuario (obligatorio)
- **Países/regiones**: Define dónde quieres publicarla

## 3. Configuración en la consola

Debes completar esta información antes de enviar a revisión:

| Campo | Descripción |
| --- | --- |
| País de publicación | Países donde estará disponible la app |
| Categoría | Según el propósito de la app |
| Paquete ZAB | El AppId debe coincidir con el de la página |
| Dispositivos soportados | Se detectan automáticamente al subir el ZAB |
| Versión | Se detecta automáticamente del paquete |
| Idiomas | Con nombre, descripción y detalles traducidos por idioma |
| Permisos de datos | Permisos que usa la app (o "None" si no usa) |
| SDKs de terceros | Declarar nombre del SDK y propósito si aplica |

## 4. Proceso de revisión

- Envías la app con **Submit for Approval**
- El tiempo de revisión es de **1 a 5 días hábiles**
- Si es rechazada, puedes ver el motivo y corregirla con **Edit**
- Una vez aprobada, puedes actualizar versiones posteriormente mediante **Version Upgrade**

## Requisitos técnicos previos

- Node.js ≥ 14.0.0
- Zeus CLI: `npm i @zeppos/zeus-cli -g`
- App de Zepp en tu teléfono con "Modo Desarrollador" activado (Profile → Settings → About → tocar el icono de Zepp 7 veces) para pruebas reales, o el simulador Zepp OS

## Flujo resumido

```
Crear app en consola → Obtener AppId → Configurar app.json →
Desarrollar → zeus build (genera .zab) → Subir a consola →
Completar información → Submit for Approval → Revisión (1-5 días) → Publicada
```

## Notas

- El nombre de la app no puede estar ocupado por otra app tuya
- El nombre de desarrollador mostrado es el nickname de tu cuenta (Account Center → Account Information → Nickname); se actualiza en la tienda tras pasar una revisión
- Si la plataforma detecta nuevos dispositivos compatibles, adaptará y distribuirá tu Mini Program automáticamente
