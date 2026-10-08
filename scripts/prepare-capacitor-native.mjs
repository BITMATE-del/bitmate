import fs from 'node:fs';

// Preserve the exact approved BITMATE PNGs. Never recreate the mark as vector/text.
const officialSymbol='public/assets/brand/bitmate-symbol.png';
const officialHorizontal='public/assets/brand/bitmate-logo-horizontal.png';
if(!fs.existsSync(officialSymbol)||!fs.existsSync(officialHorizontal)){
  throw new Error('Official BITMATE PNG assets are required for native builds.');
}
const {default:sharp}=await import('sharp');
fs.mkdirSync('assets',{recursive:true});
const bg={r:9,g:11,b:13,alpha:1};
// Android/iOS launcher: official symbol, padded inside a square rather than stretched.
const symbol=await sharp(officialSymbol).trim().resize(720,720,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
await sharp({create:{width:1024,height:1024,channels:4,background:bg}})
  .composite([{input:symbol,gravity:'centre'}]).png().toFile('assets/icon.png');
// Splash: official HORIZONTAL logo on a full dark canvas. Never use the symbol-only icon here.
const horizontal=await sharp(officialHorizontal).trim()
  .resize({width:900,height:360,fit:'inside',withoutEnlargement:true}).png().toBuffer();
await sharp({create:{width:2732,height:2732,channels:4,background:bg}})
  .composite([{input:horizontal,gravity:'centre'}]).png().toFile('assets/splash.png');

function patchFile(path,fn){
  if(!fs.existsSync(path))return false;
  const before=fs.readFileSync(path,'utf8');
  const after=fn(before);
  if(after!==before)fs.writeFileSync(path,after);
  return true;
}

patchFile('android/app/build.gradle',s=>s
  .replace(/versionCode\s+\d+/, 'versionCode 3')
  .replace(/versionName\s*=\s*"[^"]+"/,'versionName = "1.0.1"')
  .replace(/versionName\s+"[^"]+"/,'versionName "1.0.1"')
);

patchFile('android/app/src/main/AndroidManifest.xml',s=>{
  if(s.includes('android:scheme="bitmate"'))return s;
  const marker='</activity>';
  const intent=`
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="bitmate" />
            </intent-filter>
`;
  return s.replace(marker,intent+'        '+marker);
});

patchFile('ios/App/App/Info.plist',s=>{
  if(s.includes('<string>bitmate</string>'))return s;
  const block=`
\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>com.bitmate.app</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>bitmate</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
  const rootClose=s.lastIndexOf('</dict>');
  if(rootClose<0)return s;
  return s.slice(0,rootClose)+block+s.slice(rootClose);
});

patchFile('ios/App/App.xcodeproj/project.pbxproj',s=>
  s.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,'CURRENT_PROJECT_VERSION = 3;').replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 1.0.2;')
);

if(fs.existsSync('android')){
  fs.writeFileSync('android/keystore.properties.example',[
    '# Copy to android/keystore.properties. Never commit the real file.',
    'storeFile=/absolute/path/to/bitmate-release.keystore',
    'storePassword=CHANGE_ME',
    'keyAlias=bitmate',
    'keyPassword=CHANGE_ME',
    ''
  ].join('\n'));
}

console.log('BITMATE native project configuration applied.');
