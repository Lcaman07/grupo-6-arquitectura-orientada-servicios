/**
 * Hooks globales de auditoría (equivalente a @PrePersist / @PreUpdate de JPA)
 * ----------------------------------------------------------------------------
 * Para cualquier modelo que tenga los campos de models/auditoria.js:
 *  - INSERT (create, bulkCreate, upsert): llena usuarioCrea con el usuario del token
 *  - UPDATE (save, Model.update):         llena usuarioModif y fechaModif
 *
 * Así se corrige "Field 'usuario_crea' doesn't have a default value" en todas las tablas.
 */
const { usuarioActual } = require('../utils/contexto');

const tiene = (model, campo) => Boolean(model && model.rawAttributes && model.rawAttributes[campo]);

function alCrear(instance) {
  const model = instance.constructor;
  if (tiene(model, 'usuarioCrea') && !instance.get('usuarioCrea')) {
    instance.set('usuarioCrea', usuarioActual());
  }
}

function alActualizar(instance) {
  const model = instance.constructor;
  if (tiene(model, 'usuarioModif')) {
    instance.set('usuarioModif', usuarioActual());
    instance.set('fechaModif', new Date());
  }
}

module.exports = (sequelize) => {
  //-- beforeValidate: la validación notNull de Sequelize corre ANTES que beforeCreate
  sequelize.addHook('beforeValidate', (instance) => { if (instance.isNewRecord) alCrear(instance); });
  sequelize.addHook('beforeCreate', alCrear);
  sequelize.addHook('beforeBulkCreate', (instances) => instances.forEach(alCrear));
  sequelize.addHook('beforeUpdate', alActualizar);

  //-- Model.update({...}, { where })
  sequelize.addHook('beforeBulkUpdate', (options) => {
    if (!tiene(options.model, 'usuarioModif')) return;
    options.attributes.usuarioModif = usuarioActual();
    options.attributes.fechaModif = new Date();
    if (Array.isArray(options.fields)) {
      ['usuarioModif', 'fechaModif'].forEach((c) => { if (!options.fields.includes(c)) options.fields.push(c); });
    }
  });

  //-- Model.upsert({...}) -> INSERT ... ON DUPLICATE KEY UPDATE (MySQL exige usuario_crea aunque actualice)
  sequelize.addHook('beforeUpsert', (values, options) => {
    if (!tiene(options.model, 'usuarioCrea')) return;
    if (!values.usuarioCrea) values.usuarioCrea = usuarioActual();
    if (tiene(options.model, 'usuarioModif')) {
      values.usuarioModif = usuarioActual();
      values.fechaModif = new Date();
    }
  });
};
