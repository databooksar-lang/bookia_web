import { AppLink } from "../navigation";

export function CookiePolicyPage() {
  return (
    <article className="editorial-page about-page legal-page">
      <p className="section-label">Politica de Cookies</p>
      <h1>Cookies tecnicas para que Bookia funcione.</h1>
      <p>Vigente desde el 31 de agosto de 2026.</p>

      <h2>Responsable</h2>
      <p>Marcelo Gabriel Gonzalez, en el partido de Gral San Martin, Provincia de Buenos Aires. Consultas: <a href="mailto:bookia.app.admin@gmail.com">bookia.app.admin@gmail.com</a>.</p>

      <h2>Que cookies usamos</h2>
      <p>Bookia usa cookies tecnicas necesarias para iniciar sesion, mantener la cuenta abierta y proteger formularios contra solicitudes no autorizadas.</p>
      <p><strong>bookia_session</strong> identifica la sesion iniciada. <strong>bookia_csrf</strong> ayuda a validar acciones sensibles y reducir abusos de seguridad.</p>
      <p><strong>bookia_google_oauth</strong> protege temporalmente el inicio o registro con Google. <strong>bookia_google_owner_link</strong> protege temporalmente la vinculacion de una cuenta de libreria con Google. Ambas son cookies HTTP-only y duran hasta 10 minutos.</p>
      <p><strong>bookia_tiendanube_oauth</strong> protege temporalmente la conexion de una libreria con Tiendanube, vincula el retorno con la misma sesion y evita solicitudes falsificadas. Es HTTP-only, se limita a la ruta de la integracion y dura hasta 10 minutos.</p>
      <p><strong>bookia_google_sheets_oauth</strong> protege temporalmente la conexion de una libreria con Google Sheets, vincula la planilla elegida y el retorno de Google con la misma cuenta y evita solicitudes falsificadas. Es HTTP-only, se limita a la ruta de la integracion y dura hasta 10 minutos.</p>

      <h2>Finalidad y duracion</h2>
      <p>Estas cookies se usan solo para prestar el servicio, autenticar usuarios, proteger la plataforma y recordar temporalmente la sesion. Pueden durar hasta el cierre de sesion, el vencimiento configurado por Bookia o la eliminacion manual desde el navegador.</p>

      <h2>Cookies que no usamos</h2>
      <p>No usamos cookies de analitica ni publicidad. Tampoco usamos cookies para crear perfiles comerciales de navegacion ni para vender informacion a terceros.</p>

      <h2>Como gestionarlas</h2>
      <p>Podes borrar o bloquear cookies desde la configuracion de tu navegador. Si bloqueas las cookies tecnicas, algunas funciones como ingresar, mantener la sesion o guardar cambios pueden dejar de funcionar correctamente.</p>

      <h2>Cambios</h2>
      <p>Actualizaremos esta politica si Bookia incorpora nuevas cookies, analitica, publicidad u otros tratamientos relacionados.</p>
      <p><AppLink href="/privacy">Ver Politica de Privacidad</AppLink></p>
    </article>
  );
}
