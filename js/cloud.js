/* HOLO démo — aucune synchronisation en ligne : tout reste dans le navigateur du visiteur */
(function () {
  'use strict';
  const no = async () => { throw new Error('Indisponible dans la démo'); };
  window.Cloud = {
    on: false, status: 'local', rev: 0, bio: 'Face ID', open: true,
    canBio: () => false,
    init: async () => false,
    snapshot: () => {}, flush: async () => {}, pull: async () => {},
    uploadImage: async dataUrl => dataUrl,
    backups: async () => [], backup: no,
    logout: async () => {}, devices: async () => [], addDevice: no, removeDevice: no,
    onStatus: () => {}
  };
})();
