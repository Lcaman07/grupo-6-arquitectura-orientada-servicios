/**
 * Excepciones (equivalente a MktdBaseException, MktdTXException, MktdSOAException, MktdDBException)
 *
 * - MktdTXException : error de negocio / transaccional
 * - MktdSOAException: error de validación del request (lleva la lista de errores por campo)
 * - MktdDBException : error de base de datos
 */
class MktdBaseException extends Error {
  constructor(msjError, { codError = null, objException = null } = {}) {
    super(msjError);
    this.name = this.constructor.name;
    this.msjError = msjError;
    this.codError = codError;
    this.objException = objException;
  }
}

class MktdTXException extends MktdBaseException {
  constructor(message, errors = null) {
    super(message);
    this.errors = errors;
  }
}

class MktdSOAException extends MktdBaseException {
  /**
   * @param {string} message
   * @param {Array<{resource,field,code,message}>} errors errores por campo
   */
  constructor(message, errors = null) {
    super(message);
    this.errors = errors;
  }
}

class MktdDBException extends MktdBaseException {
  constructor(message, errors = null) {
    super(message);
    this.errors = errors;
  }
}

module.exports = { MktdBaseException, MktdTXException, MktdSOAException, MktdDBException };
