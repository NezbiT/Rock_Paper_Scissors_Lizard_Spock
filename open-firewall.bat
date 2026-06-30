@echo off
echo Abriendo puerto 3000 en el Firewall de Windows...
netsh advfirewall firewall add rule name="RPSLS Game 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
if %errorlevel%==0 (
  echo Listo. Otras PCs ya pueden conectarse al juego.
) else (
  echo Error. Ejecuta este archivo como Administrador ^(clic derecho - Ejecutar como administrador^).
)
pause