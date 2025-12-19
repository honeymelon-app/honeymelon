import { Locale } from '@/lib/locale';

export const messages = {
  [Locale.EN]: {
    app: {
      license: {
        requiredTitle: 'Activation Required',
        requiredBody:
          'Enter your Honeymelon license to unlock the media converter. The window will reopen automatically.',
        instructions:
          'If you just purchased a license, copy the key from your email or the customer portal.',
        enterKey: 'Enter License Key',
      },
    },
    media: {
      video: 'Video',
      audio: 'Audio',
      image: 'Image',
    },
    upload: {
      title: 'Drag and drop your {type} files here',
      message: 'or click here to select files for upload',
      select: 'Select file(s)',
      compactPrompt: 'Drop more files or',
      browse: 'Browse',
      browseAria: 'Browse for more media files',
      ariaFull: 'Upload files',
      ariaCompact: 'Upload more files',
    },
    item: {
      from: 'Converting from',
      to: 'to',
    },
    formats: {
      select: 'Select format',
      convertsTo: 'Converts to',
      empty: 'No formats available',
      search: 'Search formats',
    },
    buttons: {
      remove: 'Remove',
      clear: 'Clear',
      cancel: 'Cancel',
      convert: 'Convert',
      converting: 'Converting...',
    },
    queue: {
      title: 'Queue',
      count: '{count} file | {count} files',
      emptyTitle: 'Queue is empty',
      emptyBody: 'Files you add will appear here',
      actions: {
        clearCompleted: 'Clear completed',
        clearQueue: 'Clear queue',
        convertAll: 'Convert all',
        convertAllTooltip: 'Start converting all queued files',
      },
    },
    job: {
      unknownFile: 'Unknown File',
      status: {
        queued: 'Waiting',
        probing: 'Analyzing',
        planning: 'Planning',
        running: 'Converting',
        completed: 'Done',
        failed: 'Failed',
        cancelled: 'Cancelled',
        unknown: 'Unknown',
      },
      errors: {
        inputProblem: 'The source file may be corrupted or inaccessible. Try a different file.',
        unsupportedCombination: "This format combination isn't supported. Try a different preset.",
        resourceIssue: 'Check available disk space and close other applications.',
        timeout: 'The conversion took too long. Try a faster preset or shorter file.',
        internal: 'An unexpected error occurred. Please try again or report this issue.',
      },
      permissionHelp:
        'Choose a different output folder or grant Honeymelon Full Disk Access in System Settings.',
      actions: {
        showInFinder: 'Show in Finder',
        start: 'Start',
        startTooltip: 'Start converting this file',
        cancel: 'Cancel job',
        remove: 'Remove from list',
        openSettings: 'Open Settings',
        copyPath: 'Copy File Path',
        contextStart: 'Start Conversion',
        contextCancel: 'Cancel',
      },
    },
    destination: {
      tooltip: 'Destination: {path}',
      title: 'Output Destination',
      sameAsSource: 'Same as source file',
      sameAsSourceHint: 'Save converted files in the same folder as the original',
      customFolder: 'Custom folder',
      choosing: 'Choosing folder...',
      choosePrompt: 'Click to choose a destination folder',
      close: 'Close',
    },
  },
  [Locale.FR]: {
    app: {
      license: {
        requiredTitle: 'Activation requise',
        requiredBody:
          'Entrez votre licence Honeymelon pour débloquer le convertisseur multimédia. La fenêtre se rouvrira automatiquement.',
        instructions:
          "Si vous venez d'acheter une licence, copiez la clé depuis votre e-mail ou le portail client.",
        enterKey: 'Entrer la clé de licence',
      },
    },
    media: {
      video: 'Vidéo',
      audio: 'Audio',
      image: 'Image',
    },
    upload: {
      title: 'Glissez-déposez vos fichiers {type} ici',
      message: 'ou cliquez ici pour sélectionner des fichiers à télécharger',
      select: 'Sélectionner des fichiers',
      compactPrompt: 'Déposez d’autres fichiers ou',
      browse: 'Parcourir',
      browseAria: 'Parcourir plus de fichiers multimédia',
      ariaFull: 'Téléverser des fichiers',
      ariaCompact: 'Ajouter d’autres fichiers',
    },
    item: {
      from: 'Conversion de',
      to: 'en',
    },
    formats: {
      select: 'Sélectionnez le format',
      convertsTo: 'Convertit en',
      empty: 'Aucun format disponible',
      search: 'Rechercher des formats',
    },
    buttons: {
      remove: 'Supprimer',
      clear: 'Effacer',
      cancel: 'Annuler',
      convert: 'Convertir',
      converting: 'Conversion en cours...',
    },
    queue: {
      title: 'File d’attente',
      count: '{count} fichier | {count} fichiers',
      emptyTitle: 'La file est vide',
      emptyBody: 'Les fichiers ajoutés apparaîtront ici',
      actions: {
        clearCompleted: 'Effacer terminés',
        clearQueue: 'Vider la file',
        convertAll: 'Tout convertir',
        convertAllTooltip: 'Lancer la conversion de tous les fichiers en attente',
      },
    },
    job: {
      unknownFile: 'Fichier inconnu',
      status: {
        queued: 'En attente',
        probing: 'Analyse',
        planning: 'Préparation',
        running: 'Conversion',
        completed: 'Terminé',
        failed: 'Échec',
        cancelled: 'Annulé',
        unknown: 'Inconnu',
      },
      errors: {
        inputProblem:
          'Le fichier source est peut-être corrompu ou inaccessible. Essayez un autre fichier.',
        unsupportedCombination:
          "Cette combinaison de formats n'est pas supportée. Essayez un autre préréglage.",
        resourceIssue: 'Vérifiez l’espace disque disponible et fermez les autres applications.',
        timeout:
          'La conversion est trop longue. Essayez un préréglage plus rapide ou un fichier plus court.',
        internal: 'Une erreur inattendue est survenue. Réessayez ou signalez le problème.',
      },
      permissionHelp:
        'Choisissez un autre dossier de sortie ou accordez l’accès complet au disque à Honeymelon dans les Réglages Système.',
      actions: {
        showInFinder: 'Afficher dans le Finder',
        start: 'Démarrer',
        startTooltip: 'Lancer la conversion de ce fichier',
        cancel: 'Annuler',
        remove: 'Retirer de la liste',
        openSettings: 'Ouvrir les réglages',
        copyPath: 'Copier le chemin du fichier',
        contextStart: 'Démarrer la conversion',
        contextCancel: 'Annuler',
      },
    },
    destination: {
      tooltip: 'Destination : {path}',
      title: 'Dossier de sortie',
      sameAsSource: 'Même que le fichier source',
      sameAsSourceHint: 'Enregistrer les fichiers convertis dans le même dossier que l’original',
      customFolder: 'Dossier personnalisé',
      choosing: 'Choix du dossier...',
      choosePrompt: 'Cliquez pour choisir un dossier de destination',
      close: 'Fermer',
    },
  },
  [Locale.ES]: {
    app: {
      license: {
        requiredTitle: 'Activación requerida',
        requiredBody:
          'Ingresa tu licencia de Honeymelon para desbloquear el convertidor de medios. La ventana se reabrirá automáticamente.',
        instructions:
          'Si acabas de comprar una licencia, copia la clave desde tu correo electrónico o el portal del cliente.',
        enterKey: 'Ingresar clave de licencia',
      },
    },
    media: {
      video: 'Vídeo',
      audio: 'Audio',
      image: 'Imagen',
    },
    upload: {
      title: 'Arrastra y suelta tus archivos {type} aquí',
      message: 'o haz clic aquí para seleccionar archivos para subir',
      select: 'Seleccionar archivos',
      compactPrompt: 'Suelta más archivos o',
      browse: 'Explorar',
      browseAria: 'Explorar más archivos multimedia',
      ariaFull: 'Subir archivos',
      ariaCompact: 'Subir más archivos',
    },
    item: {
      from: 'Convirtiendo de',
      to: 'a',
    },
    formats: {
      select: 'Seleccionar formato',
      convertsTo: 'Convierte a',
      empty: 'No hay formatos disponibles',
      search: 'Buscar formatos',
    },
    buttons: {
      remove: 'Eliminar',
      clear: 'Limpiar',
      cancel: 'Cancelar',
      convert: 'Convertir',
      converting: 'Convirtiendo...',
    },
    queue: {
      title: 'Cola',
      count: '{count} archivo | {count} archivos',
      emptyTitle: 'La cola está vacía',
      emptyBody: 'Los archivos que agregues aparecerán aquí',
      actions: {
        clearCompleted: 'Limpiar completados',
        clearQueue: 'Vaciar cola',
        convertAll: 'Convertir todo',
        convertAllTooltip: 'Iniciar la conversión de todos los archivos en cola',
      },
    },
    job: {
      unknownFile: 'Archivo desconocido',
      status: {
        queued: 'En espera',
        probing: 'Analizando',
        planning: 'Planificando',
        running: 'Convirtiendo',
        completed: 'Listo',
        failed: 'Error',
        cancelled: 'Cancelado',
        unknown: 'Desconocido',
      },
      errors: {
        inputProblem:
          'El archivo fuente puede estar dañado o inaccesible. Prueba con otro archivo.',
        unsupportedCombination:
          'Esta combinación de formatos no es compatible. Prueba otro ajuste.',
        resourceIssue: 'Revisa el espacio en disco disponible y cierra otras aplicaciones.',
        timeout:
          'La conversión tardó demasiado. Prueba un ajuste más rápido o un archivo más corto.',
        internal: 'Ocurrió un error inesperado. Intenta de nuevo o repórtalo.',
      },
      permissionHelp:
        'Elige otra carpeta de salida o concede a Honeymelon acceso completo al disco en Configuración del sistema.',
      actions: {
        showInFinder: 'Mostrar en Finder',
        start: 'Iniciar',
        startTooltip: 'Comenzar a convertir este archivo',
        cancel: 'Cancelar',
        remove: 'Quitar de la lista',
        openSettings: 'Abrir ajustes',
        copyPath: 'Copiar ruta del archivo',
        contextStart: 'Iniciar conversión',
        contextCancel: 'Cancelar',
      },
    },
    destination: {
      tooltip: 'Destino: {path}',
      title: 'Destino de salida',
      sameAsSource: 'Igual que el archivo origen',
      sameAsSourceHint: 'Guardar archivos convertidos en la misma carpeta que el original',
      customFolder: 'Carpeta personalizada',
      choosing: 'Eligiendo carpeta...',
      choosePrompt: 'Haz clic para elegir una carpeta de destino',
      close: 'Cerrar',
    },
  },
  [Locale.DE]: {
    app: {
      license: {
        requiredTitle: 'Aktivierung erforderlich',
        requiredBody:
          'Geben Sie Ihre Honeymelon-Lizenz ein, um den Medienkonverter freizuschalten. Das Fenster wird automatisch wieder geöffnet.',
        instructions:
          'Wenn Sie gerade eine Lizenz erworben haben, kopieren Sie den Schlüssel aus Ihrer E-Mail oder dem Kundenportal.',
        enterKey: 'Lizenzschlüssel eingeben',
      },
    },
    media: {
      video: 'Video',
      audio: 'Audio',
      image: 'Bild',
    },
    upload: {
      title: 'Ziehen Sie Ihre {type}-Dateien hierher',
      message: 'oder klicken Sie hier, um Dateien zum Hochladen auszuwählen',
      select: 'Dateien auswählen',
      compactPrompt: 'Weitere Dateien hier ablegen oder',
      browse: 'Durchsuchen',
      browseAria: 'Weitere Mediendateien auswählen',
      ariaFull: 'Dateien hochladen',
      ariaCompact: 'Weitere Dateien hochladen',
    },
    item: {
      from: 'Konvertierung von',
      to: 'nach',
    },
    formats: {
      select: 'Format auswählen',
      convertsTo: 'Konvertiert zu',
      empty: 'Keine Formate verfügbar',
      search: 'Formate suchen',
    },
    buttons: {
      remove: 'Entfernen',
      clear: 'Löschen',
      cancel: 'Abbrechen',
      convert: 'Konvertieren',
      converting: 'Konvertiere...',
    },
    queue: {
      title: 'Warteschlange',
      count: '{count} Datei | {count} Dateien',
      emptyTitle: 'Warteschlange ist leer',
      emptyBody: 'Hinzugefügte Dateien erscheinen hier',
      actions: {
        clearCompleted: 'Abgeschlossene entfernen',
        clearQueue: 'Warteschlange leeren',
        convertAll: 'Alles konvertieren',
        convertAllTooltip: 'Alle Dateien in der Warteschlange starten',
      },
    },
    job: {
      unknownFile: 'Unbekannte Datei',
      status: {
        queued: 'Warten',
        probing: 'Analysiere',
        planning: 'Plane',
        running: 'Konvertiere',
        completed: 'Fertig',
        failed: 'Fehlgeschlagen',
        cancelled: 'Abgebrochen',
        unknown: 'Unbekannt',
      },
      errors: {
        inputProblem:
          'Die Quelldatei ist beschädigt oder nicht zugänglich. Versuche eine andere Datei.',
        unsupportedCombination:
          'Diese Formatkombination wird nicht unterstützt. Wähle ein anderes Preset.',
        resourceIssue: 'Prüfe freien Speicherplatz und schließe andere Anwendungen.',
        timeout:
          'Die Konvertierung dauert zu lange. Nutze ein schnelleres Preset oder eine kürzere Datei.',
        internal: 'Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen oder melden.',
      },
      permissionHelp:
        'Wähle einen anderen Ausgabeordner oder erlaube Honeymelon den Vollzugriff auf die Festplatte in den Systemeinstellungen.',
      actions: {
        showInFinder: 'Im Finder zeigen',
        start: 'Starten',
        startTooltip: 'Diese Datei konvertieren',
        cancel: 'Abbrechen',
        remove: 'Aus Liste entfernen',
        openSettings: 'Einstellungen öffnen',
        copyPath: 'Dateipfad kopieren',
        contextStart: 'Konvertierung starten',
        contextCancel: 'Abbrechen',
      },
    },
    destination: {
      tooltip: 'Ziel: {path}',
      title: 'Ausgabeziel',
      sameAsSource: 'Wie Quelldatei',
      sameAsSourceHint: 'Konvertierte Dateien im selben Ordner wie das Original speichern',
      customFolder: 'Eigener Ordner',
      choosing: 'Ordner wird gewählt...',
      choosePrompt: 'Klicke, um einen Zielordner zu wählen',
      close: 'Schließen',
    },
  },
  [Locale.RU]: {
    app: {
      license: {
        requiredTitle: 'Требуется активация',
        requiredBody:
          'Введите лицензию Honeymelon, чтобы разблокировать медиаконвертер. Окно откроется автоматически.',
        instructions:
          'Если вы только что приобрели лицензию, скопируйте ключ из электронной почты или личного кабинета.',
        enterKey: 'Ввести лицензионный ключ',
      },
    },
    media: {
      video: 'Видео',
      audio: 'Аудио',
      image: 'Изображение',
    },
    upload: {
      title: 'Перетащите ваши файлы {type} сюда',
      message: 'или нажмите здесь, чтобы выбрать файлы для загрузки',
      select: 'Выбрать файлы',
      compactPrompt: 'Перетащите ещё файлы или',
      browse: 'Обзор',
      browseAria: 'Выбрать другие медиафайлы',
      ariaFull: 'Загрузить файлы',
      ariaCompact: 'Добавить ещё файлы',
    },
    item: {
      from: 'Конвертация из',
      to: 'в',
    },
    formats: {
      select: 'Выберите формат',
      convertsTo: 'Преобразуется в',
      empty: 'Нет доступных форматов',
      search: 'Поиск форматов',
    },
    buttons: {
      remove: 'Удалить',
      clear: 'Очистить',
      cancel: 'Отмена',
      convert: 'Конвертировать',
      converting: 'Конвертация...',
    },
    queue: {
      title: 'Очередь',
      count: '{count} файл | {count} файла | {count} файлов',
      emptyTitle: 'Очередь пуста',
      emptyBody: 'Добавленные файлы появятся здесь',
      actions: {
        clearCompleted: 'Очистить завершенные',
        clearQueue: 'Очистить очередь',
        convertAll: 'Конвертировать все',
        convertAllTooltip: 'Запустить конвертацию всех файлов в очереди',
      },
    },
    job: {
      unknownFile: 'Неизвестный файл',
      status: {
        queued: 'Ожидание',
        probing: 'Анализ',
        planning: 'Планирование',
        running: 'Конвертация',
        completed: 'Готово',
        failed: 'Ошибка',
        cancelled: 'Отменено',
        unknown: 'Неизвестно',
      },
      errors: {
        inputProblem: 'Исходный файл поврежден или недоступен. Попробуйте другой файл.',
        unsupportedCombination:
          'Эта комбинация форматов не поддерживается. Попробуйте другой пресет.',
        resourceIssue: 'Проверьте свободное место на диске и закройте другие приложения.',
        timeout:
          'Конвертация заняла слишком много времени. Попробуйте более быстрый пресет или более короткий файл.',
        internal: 'Произошла непредвиденная ошибка. Попробуйте ещё раз или сообщите о проблеме.',
      },
      permissionHelp:
        'Выберите другой выходной каталог или предоставьте Honeymelon полный доступ к диску в настройках системы.',
      actions: {
        showInFinder: 'Показать в Finder',
        start: 'Запустить',
        startTooltip: 'Начать конвертацию этого файла',
        cancel: 'Отменить',
        remove: 'Убрать из списка',
        openSettings: 'Открыть настройки',
        copyPath: 'Скопировать путь к файлу',
        contextStart: 'Запустить конвертацию',
        contextCancel: 'Отменить',
      },
    },
    destination: {
      tooltip: 'Путь сохранения: {path}',
      title: 'Папка вывода',
      sameAsSource: 'Как исходный файл',
      sameAsSourceHint: 'Сохранять конвертированные файлы в ту же папку, что и оригинал',
      customFolder: 'Другая папка',
      choosing: 'Выбор папки...',
      choosePrompt: 'Нажмите, чтобы выбрать папку назначения',
      close: 'Закрыть',
    },
  },
};
