export function normalizePhoneE164(code:string,input:string){
  const digits=input.replace(/\D/g,'');
  if(!digits)return '';
  if(input.trim().startsWith('+'))return '+'+digits;
  const normalizedCode=code.startsWith('+')?code:'+'+code.replace(/\D/g,'');
  const local=normalizedCode==='+82'&&digits.startsWith('0')?digits.slice(1):digits;
  return normalizedCode+local;
}

export function formatKoreanPhoneInput(input:string){
  const digits=input.replace(/\D/g,'').slice(0,11);
  if(digits.length<=3)return digits;
  if(digits.length<=7)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}
