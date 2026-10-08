import fs from 'node:fs';

const officialSymbol='public/assets/brand/bitmate-symbol.png';
if(fs.existsSync(officialSymbol)){
  fs.mkdirSync('assets',{recursive:true});
  fs.copyFileSync(officialSymbol,'assets/icon.png');
  fs.copyFileSync(officialSymbol,'assets/splash.png');
}

function patchFile(path,fn){
  if(!fs.existsSync(path))return false;
  const before=fs.readFileSync(path,'utf8');
  const after=fn(before);
  if(after!==before)fs.writeFileSync(path,after);
  return true;
}

patchFile('android/app/build.gradle',s=>s
  .replace(/versionCode\s+\d+/, 'versionCode 2')
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
  s.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,'CURRENT_PROJECT_VERSION = 2;').replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 1.0.1;')
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
