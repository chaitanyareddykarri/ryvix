import nodemailer from 'nodemailer';
export function smtpSettings(env:NodeJS.ProcessEnv=process.env){
  const host=env.SMTP_HOST||'smtp.gmail.com',port=Number(env.SMTP_PORT||465);
  if(!env.SMTP_USER||!env.SMTP_PASSWORD||!host||/[\s/]/.test(host)||![465,587].includes(port))throw new Error('SMTP credentials and TLS port required');
  return {host,port,secure:port===465,requireTLS:true,tls:{rejectUnauthorized:true},
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000};
}
export async function sendSmtpMail(mail:{to:string;from:string;subject:string;text:string;html?:string;messageId?:string},create=nodemailer.createTransport){
  if(/[\r\n]/.test(mail.to+mail.from)||!mail.from||!mail.to)throw new Error('Invalid mail addresses');
  const transport=create(smtpSettings());
  try{const result=await transport.sendMail({...mail,disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.length||result.rejected?.length||!result.messageId)throw new Error('SMTP acceptance unavailable');
    return String(result.messageId);
  }finally{transport.close();}
}
