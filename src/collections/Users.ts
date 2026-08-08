import type { CollectionConfig } from 'payload'

import { hiddenFromEditors, isAdminRole, isAdminRoleField } from '../access/isAdminRole'

/**
 * Admin users only (Silviu + team). Clients never get accounts or log in —
 * seats are named participants on orders, not site users (CLAUDE.md §3.1).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: { en: 'System', ro: 'Sistem' },
    description: {
      en: 'Dashboard user accounts only: administrators and editors. Site clients never get accounts and never log in; course participants are recorded on their orders instead.',
      ro: 'Doar conturile utilizatorilor dashboard-ului: administratori și editori. Clienții site-ului nu primesc conturi și nu se autentifică niciodată; participanții la cursuri sunt înregistrați pe comenzile lor.',
    },
    // User management is admin-only — editors still reach their own account page.
    hidden: hiddenFromEditors,
  },
  // Cookie de sesiune întărit: `secure` DOAR în producție (peste https) — altfel login-ul
  // local pe http ar pica; `httpOnly`/`sameSite: Lax` rămân pe default-urile sigure Payload.
  auth: {
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  // Fără un `access` explicit, orice user logat putea crea alți useri și schimba roluri —
  // adică un `editor` s-ar fi putut promova singur la `admin`. Doar `admin` gestionează
  // userii; oricine își poate edita propriul cont (schimbare parolă) (securitate: A01).
  access: {
    // Editors see only their own row (account page); the full user list is admin-only.
    read: ({ req: { user } }) =>
      user?.role === 'admin' ? true : user ? { id: { equals: user.id } } : false,
    create: isAdminRole,
    update: ({ req: { user }, id }) => user?.role === 'admin' || (Boolean(user) && user?.id === id),
    delete: isAdminRole,
  },
  fields: [
    { name: 'name', type: 'text', label: { en: 'Full name', ro: 'Nume complet' } },
    // Rolul poate fi setat/modificat DOAR de un admin — altfel un editor și-ar putea ridica
    // singur privilegiile editându-și propriul rând.
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      saveToJWT: true,
      access: { create: isAdminRoleField, update: isAdminRoleField },
      options: [
        { label: { en: 'Admin', ro: 'Administrator' }, value: 'admin' },
        { label: { en: 'Editor', ro: 'Editor' }, value: 'editor' },
      ],
    },
  ],
}
