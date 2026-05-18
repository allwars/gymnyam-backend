/**
 * update-storage-images.js
 * Matching: normalize(product.name) → archivo que empieza igual en storage
 * Ej: "Lechuga iceberg" → lechuga_iceberg_2802.jpg
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET       = 'images';
const DRY_RUN      = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalize(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function publicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function listAllFiles() {
  const files = [];
  // Prueba raíz y subcarpeta 'files' (donde están los 7869)
  for (const folder of ['', 'files']) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage
        .from(BUCKET).list(folder, { limit: 1000, offset });
      if (error || !data || data.length === 0) break;
      for (const f of data) {
        if (f.id !== null) {  // id null = subcarpeta
          const path = folder ? `${folder}/${f.name}` : f.name;
          files.push({ path, name: f.name });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return files;
}

async function main() {
  console.log(`\n🗂️  ${DRY_RUN ? 'DRY-RUN' : 'ESCRITURA'}\n`);

  // Cargar productos
  const products = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('custom_products').select('id, name, nutritional_info').range(from, from + 499);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    products.push(...data);
    if (data.length < 500) break;
    from += 500;
  }
  console.log(`🛒 ${products.length} productos`);

  // Listar archivos y construir mapa slug → path
  const files = await listAllFiles();
  console.log(`📦 ${files.length} archivos en storage\n`);

  if (!files.length) {
    console.error('❌ Sin archivos. Verifica que el bucket sea público.');
    process.exit(1);
  }

  // Mapa: slug (sin _ID.ext) → path completo
  // "lechuga_iceberg_2802.jpg" → slug "lechuga_iceberg"
  const slugMap = new Map();
  for (const f of files) {
    const slug = f.name.replace(/\.[^.]+$/, '').replace(/_\d+$/, '');
    if (!slugMap.has(slug)) slugMap.set(slug, f.path);
  }

  let matched = 0, skipped = 0, alreadyOk = 0, errors = 0;

  for (const prod of products) {
    const ni = prod.nutritional_info || {};

    if ((ni.off_image || '').includes('supabase.co/storage')) {
      alreadyOk++; continue;
    }

    const slug = normalize(prod.name);

    // 1. Match exacto
    let path = slugMap.get(slug) || null;

    // 2. Si no, buscar el archivo cuyo slug empieza por el slug del producto
    if (!path) {
      for (const [fileSlug, filePath] of slugMap) {
        if (fileSlug.startsWith(slug + '_') || fileSlug === slug) {
          path = filePath; break;
        }
      }
    }

    // 3. Si el producto tiene varias palabras, buscar que el slug del archivo las contenga todas
    if (!path) {
      const words = slug.split('_').filter(w => w.length > 2);
      let bestHits = 0;
      for (const [fileSlug, filePath] of slugMap) {
        const hits = words.filter(w => fileSlug.includes(w)).length;
        if (hits === words.length && hits > bestHits) {
          bestHits = hits; path = filePath;
        }
      }
    }

    if (!path) {
      console.log(`  ❓ "${prod.name}"`);
      skipped++; continue;
    }

    const newUrl = publicUrl(path);
    console.log(`  ✅ ${prod.name}\n     → ${newUrl}`);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('custom_products')
        .update({ nutritional_info: { ...ni, off_image: newUrl }, updated_at: new Date().toISOString() })
        .eq('id', prod.id);
      if (error) { console.error(`     ❌ ${error.message}`); errors++; }
      else matched++;
    } else {
      matched++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Actualizados:        ${matched}`);
  console.log(`⏭️  Ya en Supabase:      ${alreadyOk}`);
  console.log(`❓ Sin match:           ${skipped}`);
  if (errors) console.log(`❌ Errores:             ${errors}`);
  if (DRY_RUN) console.log('\n(Sin cambios — quita --dry-run para aplicar)');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
