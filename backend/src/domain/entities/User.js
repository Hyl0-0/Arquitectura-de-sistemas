// Domain Entity: User
export class User {
  static ROLES = {
    ADMIN: 'ADMIN',
    JEFATURA: 'JEFATURA',
    PROFESOR: 'PROFESOR',
    COLABORADOR: 'COLABORADOR'
  };

  constructor({
    id,
    tenantId,
    name,
    email,
    role = User.ROLES.COLABORADOR,
    sede = 'Santiago',
    cargo = 'Operario',
    activo = true
  }) {
    if (!id || !tenantId || !email) {
      throw new Error('User requires id, tenantId, and email');
    }
    if (!Object.values(User.ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    this.id = id;
    this.tenantId = tenantId;
    this.name = name;
    this.email = email;
    this.role = role;
    this.sede = sede;
    this.cargo = cargo;
    this.activo = activo;
  }
}
