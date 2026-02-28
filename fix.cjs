const fs = require('fs');
let text = fs.readFileSync('components/ClinicDoctorSearch.tsx', 'utf8');

// Replace the import
if (text.includes("import { type Language } from '../utils/translations';")) {
  text = text.replace(
    "import { type Language } from '../utils/translations';",
    "import { t, type Language } from '../utils/translations';"
  );
}

// Replace all occurrences of {t[language].xxxx} with {t('xxxx', language)}
// and t[language].xxxx with t('xxxx', language)
text = text.replace(/t\[language\]\.([a-zA-Z0-9_]+)/g, "t('$1', language)");

fs.writeFileSync('components/ClinicDoctorSearch.tsx', text, 'utf8');
console.log('Fixed ClinicDoctorSearch.tsx!');
