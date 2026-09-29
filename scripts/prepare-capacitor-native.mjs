import fs from 'node:fs';

function patchFile(path,fn){
  if(!fs.existsSync(path))return false;
  const before=fs.readFileSync(path,'utf8');
  const after=fn(before);
  if(after!==before)fs.writeFileSync(path,after);
  return true;
}

patchFile('android/app/build.gradle',s=>s
  .replace(/versionName\s*=\s*"[^"]+"/,'versionName = "1.0.0"')
  .replace(/versionName\s+"[^"]+"/,'versionName "1.0.0"')
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
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>com.bitmate.app</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>bitmate</string>
			</array>
		</dict>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<true/>
`;
  return s.replace('</dict>',block+'</dict>');
});

patchFile('ios/App/App.xcodeproj/project.pbxproj',s=>
  s.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 1.0.0;')
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
