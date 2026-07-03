const url = 'https://tggttbswenzkwpluxpaq.supabase.co/rest/v1/profiles?role=eq.student';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZ3R0YnN3ZW56a3dwbHV4cGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTQ3MzcsImV4cCI6MjA5Mzk3MDczN30.P6-0MkGlAeaUdjvxS2-sONeg7Q8SEhvanej42__9ziQ';

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(res => res.json())
.then(data => {
  data.forEach(p => {
    if (p.full_name.includes('srithikan')) {
      console.log('Full Profile for srithikan s:');
      console.log(JSON.stringify(p, null, 2));
    }
  });
})
.catch(err => {
  console.error(err);
});
