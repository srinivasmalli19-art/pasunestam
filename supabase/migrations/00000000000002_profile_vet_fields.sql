-- The "Issuing veterinarian" details that appear on every certificate's
-- header and signature block. In the pasunestam.html prototype these lived
-- in the browser's local storage; now they're part of the vet's profile so
-- they follow the vet across devices and back an atomic numbering scheme.

alter table public.profiles
  add column designation text not null default 'Veterinary Assistant Surgeon',
  add column registration_no text,
  add column institution text,
  add column mandal text,
  add column district text;
