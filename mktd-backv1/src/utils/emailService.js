/**
 * Envío de correos (equivalente a EmailService.java + Thymeleaf)
 * Las plantillas están en src/templates/email y usan {{variable}}
 * Si MAIL_ENABLED=false (por defecto) solo se registra en el log, como en Java donde el envío estaba comentado.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const { getLogger } = require('./logger');

const LOGGER = getLogger('EmailService');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'email');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      requireTLS: config.mail.port === 587, //-- starttls.required
      auth: { user: config.mail.username, pass: config.mail.password },
    });
  }
  return transporter;
}

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Reemplaza {{variable}} por su valor (escapado) */
function render(template, model = {}) {
  const html = fs.readFileSync(path.join(TEMPLATES_DIR, template), 'utf8');
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => escapeHtml(model[key]));
}

/**
 * @param {{from,to,subject,template,model}} mail
 */
async function sendEmail(mail) {
  const html = render(mail.template || 'email.template.html', mail.model);
  if (!config.mail.enabled) {
    LOGGER.info(`[MAIL_ENABLED=false] Correo NO enviado a ${mail.to} - asunto: ${mail.subject}`);
    return;
  }
  await getTransporter().sendMail({ from: mail.from, to: mail.to, subject: mail.subject, html });
  LOGGER.info(`Correo enviado a ${mail.to}`);
}

const sendEmailEncuesta = (mail) => sendEmail({ ...mail, template: 'email.template.encuesta.html' });

module.exports = { sendEmail, sendEmailEncuesta, render };
