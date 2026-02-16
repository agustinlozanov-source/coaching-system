# 🎯 Coaching System

Sistema integral de gestión de coaching y evaluación de desempeño para equipos de trabajo.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ instalado
- Cuenta de Firebase
- Git
- VSCode (recomendado)

### 1. Clonar o Crear el Proyecto

```bash
# Si estás en tu máquina local, crea una carpeta y copia los archivos
mkdir coaching-system
cd coaching-system
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto (o usa uno existente)
3. Habilita **Authentication** → Email/Password
4. Crea una base de datos **Firestore** en modo test
5. Ve a Project Settings → Tus Apps → Web App
6. Copia las credenciales de configuración

### 4. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

> ⚠️ **Importante**: Nunca subas el archivo `.env.local` a Git

### 5. Crear Usuario Inicial en Firebase

Ve a Firebase Console → Authentication → Add User:
- Email: `admin@coaching.com`
- Password: `Admin123!`

### 6. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 7. Login

- Email: `admin@coaching.com`
- Password: `Admin123!`

---

## 📁 Estructura del Proyecto

```
coaching-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Dashboard protegido
│   │   ├── login/              # Página de login
│   │   └── globals.css         # Estilos globales
│   ├── components/
│   │   ├── ui/                 # Componentes UI base
│   │   └── dashboard/          # Componentes del dashboard
│   ├── lib/
│   │   ├── firebase/           # Configuración Firebase
│   │   ├── constants/          # Constantes (competencias, curva)
│   │   └── utils/              # Utilidades
│   └── types/                  # TypeScript types
├── .env.local                  # Variables de entorno (no subir a Git)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Deployment**: Vercel
- **Version Control**: Git + GitHub

---

## 📊 Funcionalidades Principales

### ✅ Implementado (MVP)

- [x] Autenticación con Firebase
- [x] Layout del dashboard con sidebar
- [x] Página principal con estadísticas
- [x] Estructura base de navegación
- [x] Diseño responsive
- [x] Sistema de tipos TypeScript
- [x] Constantes de competencias y curva de aprendizaje

### 🚧 En Desarrollo

- [ ] CRUD de Empleados
- [ ] Formulario de Evaluación
- [ ] Cálculo de métricas (efectividad, curva)
- [ ] Vista detalle de empleado
- [ ] Reportes por tipo de puesto
- [ ] Áreas de oportunidad
- [ ] Exportación a PDF

### 🔮 Próximamente

- [ ] Notificaciones por email
- [ ] Dashboard de analytics
- [ ] Multi-tenant (organizaciones)
- [ ] Roles y permisos granulares
- [ ] Historial de evaluaciones
- [ ] Gráficas interactivas

---

## 🗃️ Base de Datos Firestore

### Colecciones Principales

#### `users`
```typescript
{
  id: string
  email: string
  name: string
  role: 'admin' | 'coach' | 'colaborador' | 'gerente'
  organizationId: string
  createdAt: timestamp
}
```

#### `empleados`
```typescript
{
  id: string
  nombre: string
  cargo: string
  tipoPuesto: 'ejecutivo' | 'telemarketing' | 'asesor'
  fechaIngreso: timestamp
  activo: boolean
  coachAsignado: string
  createdAt: timestamp
}
```

#### `evaluaciones`
```typescript
{
  id: string
  empleadoId: string
  coachId: string
  fecha: timestamp
  status: 'borrador' | 'finalizada'
  secciones: {
    planeacionOrganizacion: {...}
    noNegociables: {...}
    usoSistemas: {...}
    conocimientoProducto: {...}
  }
  promedioGeneral: number
  efectividad: number
  createdAt: timestamp
}
```

---

## 🎨 Guía de Estilo

### Colores Principales

- **Primary**: Azul (#1E3A8A) - Navegación, botones principales
- **Secondary**: Verde Esmeralda (#059669) - Acciones secundarias
- **Accent**: Naranja (#EA580C) - Alertas, CTAs importantes

### Tipografía

- **Headers**: Plus Jakarta Sans
- **Body**: Inter
- **Data/Numbers**: JetBrains Mono (números tabulares)

---

## 🚢 Deployment en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. Sube tu código a GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/coaching-system.git
git push -u origin main
```

2. Ve a [Vercel](https://vercel.com)
3. Click en "Import Project"
4. Selecciona tu repositorio de GitHub
5. Configura las variables de entorno (las mismas del `.env.local`)
6. Deploy!

### Opción 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

---

## 📝 Scripts Disponibles

```bash
npm run dev      # Inicia servidor de desarrollo
npm run build    # Construye para producción
npm run start    # Inicia servidor de producción
npm run lint     # Ejecuta ESLint
```

---

## 🔐 Seguridad

### Firestore Security Rules

Agrega estas reglas en Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    match /empleados/{empleadoId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    match /evaluaciones/{evaluacionId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Firebase not configured"
- Verifica que el archivo `.env.local` existe
- Asegúrate de que todas las variables empiezan con `NEXT_PUBLIC_`
- Reinicia el servidor de desarrollo

### Error: "Cannot find module"
- Ejecuta `npm install` nuevamente
- Borra `node_modules` y `.next`, luego `npm install`

### Error en el Login
- Verifica que habilitaste Email/Password en Firebase Authentication
- Confirma que el usuario existe en Firebase Console

---

## 📞 Soporte

Para preguntas o problemas:
1. Revisa la documentación
2. Busca en los issues de GitHub
3. Crea un nuevo issue con detalles del problema

---

## 📄 Licencia

Este proyecto es privado y propietario.

---

## 🎯 Próximos Pasos

1. **Implementar CRUD de Empleados**
   - Tabla con paginación
   - Formulario crear/editar
   - Cálculo de antigüedad

2. **Formulario de Evaluación**
   - 4 secciones con competencias
   - Guardado automático (draft)
   - Validaciones

3. **Sistema de Reportes**
   - Por tipo de puesto
   - Exportación a PDF
   - Gráficas de tendencias

---

**¡Buena suerte con el desarrollo! 🚀**
