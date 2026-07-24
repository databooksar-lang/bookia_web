import { AppLink } from "../navigation";

export function TermsPage() {
  return (
    <article className="editorial-page about-page legal-page">
      <p className="section-label">Terminos y Condiciones</p>
      <h1>Reglas claras para buscar, publicar y conectar.</h1>
      <p>Vigente desde el 23 de julio de 2026.</p>
      <p>Este documento resume las condiciones de uso de Bookia y no reemplaza asesoramiento legal profesional.</p>

      <h2>Responsable</h2>
      <p>Bookia es gestionado por Marcelo Gabriel Gonzalez, en el partido de Gral San Martin, Provincia de Buenos Aires. Consultas: <a href="mailto:bookia.app.admin@gmail.com">bookia.app.admin@gmail.com</a>.</p>

      <h2>Aceptacion de los terminos</h2>
      <p>Al navegar, crear una cuenta, registrar una libreria, publicar catalogos o usar el bot de Telegram de Bookia, aceptas estos Terminos y Condiciones, la <AppLink href="/privacy">Politica de Privacidad</AppLink> y la <AppLink href="/cookies">Politica de Cookies</AppLink>.</p>

      <h2>Que es Bookia</h2>
      <p>Bookia es una plataforma digital que ayuda a lectores y visitantes a descubrir libros, librerias, vendedores de usados y proyectos relacionados con la circulacion de libros. Las librerias pueden crear y administrar una vidriera publica con datos de contacto, catalogo, imagenes, disponibilidad y actividades como clubes de lectura.</p>

      <h2>Usuarios lectores, visitantes y librerias</h2>
      <p>Las personas visitantes pueden buscar libros y consultar perfiles publicos. Las personas lectoras registradas pueden acceder a funciones de cuenta cuando esten disponibles. Las librerias registradas pueden gestionar su perfil, catalogo, fotos, disponibilidad, datos de contacto y herramientas de carga segun su plan vigente.</p>

      <h2>Registro, cuentas y seguridad</h2>
      <p>Quien crea una cuenta debe brindar informacion verdadera, mantener actualizados sus datos y proteger sus credenciales. Cada libreria es responsable por las acciones realizadas desde su cuenta web o desde usuarios de Telegram vinculados a su libreria.</p>

      <h2>Catalogos, publicaciones y contacto</h2>
      <p>Las librerias son responsables por la exactitud de nombres, autores, editoriales, fotos, descripciones, disponibilidad, estado del libro, precios informados por fuera de Bookia y datos de contacto publicados. Bookia puede ocultar, corregir o dar de baja contenido cuando detecte errores, abuso, datos falsos, infracciones o riesgos para la plataforma.</p>

      <h2>Bookia no vende libros directamente</h2>
      <p>Bookia no vende libros directamente, no cobra al lector, no procesa tarjetas y no almacena datos de medios de pago. La operacion comercial se acuerda directamente entre la persona interesada y la libreria, incluyendo precio final, reserva, disponibilidad real, entrega, retiro, envio, cambios, devoluciones, garantias y reclamos relacionados con el libro.</p>

      <h2>Planes para librerias</h2>
      <p>Bookia puede ofrecer planes gratuitos, pruebas por tiempo limitado, planes pagos, ampliaciones de catalogo y funciones con IA. Cada plan puede incluir limites de catalogo, formas de carga, funcionalidades y vigencias distintas. Los precios en ARS y condiciones comerciales pueden cambiar; las condiciones aplicables seran las informadas por Bookia al momento de la contratacion o renovacion.</p>

      <h2>Uso permitido y usos prohibidos</h2>
      <p>Bookia debe usarse de buena fe, con fines licitos y respetando derechos de terceros. No esta permitido publicar informacion falsa o enganosa, cargar contenido ofensivo o ilegal, intentar acceder a cuentas ajenas, afectar la seguridad del servicio, automatizar usos abusivos, copiar masivamente informacion de la plataforma o usar Bookia para fraudes, spam o actividades no autorizadas.</p>

      <h2>Contenido e imagenes cargadas por librerias</h2>
      <p>Al cargar textos, fotos, logos, banners o datos de catalogo, la libreria declara que tiene derecho a usarlos y autoriza a Bookia a alojarlos, mostrarlos, adaptarlos tecnicamente y usarlos dentro de la plataforma para prestar el servicio. La libreria conserva la responsabilidad sobre ese contenido.</p>

      <h2>Funciones con IA</h2>
      <p>Bookia puede usar OpenAI u otros proveedores para asistir en la extraccion de datos desde fotos, autocompletar informacion de catalogo o sugerir descripciones. Estas funciones pueden cometer errores; la libreria debe revisar y confirmar la informacion antes de publicarla.</p>

      <h2>Newsletter, privacidad y cookies</h2>
      <p>El newsletter es opcional y requiere consentimiento separado. El tratamiento de datos personales se explica en la <AppLink href="/privacy">Politica de Privacidad</AppLink>. Las cookies tecnicas necesarias para sesion y seguridad se explican en la <AppLink href="/cookies">Politica de Cookies</AppLink>.</p>

      <h2>Suspension o baja</h2>
      <p>Bookia puede suspender, limitar u ocultar cuentas, librerias, publicaciones o accesos cuando exista incumplimiento de estos terminos, actividad sospechosa, datos falsos, reclamos reiterados, riesgos de seguridad o uso que perjudique a usuarios, librerias o a la plataforma.</p>

      <h2>Disponibilidad y responsabilidad</h2>
      <p>Bookia trabaja para mantener el servicio disponible, pero no garantiza funcionamiento continuo, ausencia de errores, resultados exactos o disponibilidad permanente de catalogos, imagenes, proveedores externos, Telegram, infraestructura o funciones con IA. Bookia no responde por acuerdos comerciales celebrados directamente entre lectores y librerias, sin perjuicio de los derechos irrenunciables que correspondan a consumidores segun la normativa aplicable.</p>

      <h2>Cambios en los terminos</h2>
      <p>Bookia puede actualizar estos terminos cuando cambien sus servicios, planes, proveedores, funcionalidades o requisitos legales. La version vigente se publicara en esta pagina y, si el cambio es relevante, se procurara comunicarlo por medios razonables.</p>

      <h2>Ley aplicable y contacto</h2>
      <p>Estos terminos se rigen por las leyes de la Republica Argentina. Para consultas, reclamos o solicitudes relacionadas con Bookia, podes escribir a <a href="mailto:bookia.app.admin@gmail.com">bookia.app.admin@gmail.com</a>.</p>
    </article>
  );
}