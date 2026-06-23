/**
 * Disposable/temporary email domain blocker.
 * Blocks registrations from known throwaway email services.
 */

// Common disposable email domains (top ~150 most used)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "tempmail.com",
  "throwaway.email", "temp-mail.org", "10minutemail.com", "trashmail.com",
  "yopmail.com", "sharklasers.com", "grr.la", "guerrillamailblock.com",
  "pokemail.net", "spam4.me", "bccto.me", "chacuo.net", "discard.email",
  "discardmail.com", "discardmail.de", "disposableemailaddresses.emailmiser.com",
  "drdrb.net", "emailisvalid.com", "emailondeck.com", "fakeinbox.com",
  "fakemail.fr", "flyspam.com", "get2mail.fr", "getairmail.com",
  "getnada.com", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
  "harakirimail.com", "jetable.org", "kasmail.com", "koszmail.pl",
  "kurzepost.de", "letthemeatspam.com", "lhsdv.com", "mailcatch.com",
  "maildrop.cc", "mailexpire.com", "mailforspam.com", "mailhazard.com",
  "mailhazard.us", "mailhz.me", "mailimate.com", "mailinater.com",
  "mailinator.net", "mailinator2.com", "mailincubator.com", "mailismagic.com",
  "mailmate.com", "mailnesia.com", "mailnull.com", "mailshell.com",
  "mailsiphon.com", "mailslite.com", "mailzilla.com", "mbx.cc",
  "mega.zik.dj", "meltmail.com", "mierdamail.com", "mintemail.com",
  "mjukgansen.com", "mobi.web.id", "mohmal.com", "mvrht.net",
  "mx0.wwwnew.eu", "mytemp.email", "mytrashmail.com", "nobulk.com",
  "noclickemail.com", "nogmailspam.info", "nomail.xl.cx", "nomail2me.com",
  "nospam.ze.tc", "notmailinator.com", "nowhere.org", "nowmymail.com",
  "objectmail.com", "obobbo.com", "odnorazovoe.ru", "oneoffemail.com",
  "onewaymail.com", "otherinbox.com", "ourklips.com", "outlawspam.com",
  "ovpn.to", "owlpic.com", "pancakemail.com", "pjjkp.com",
  "plexolan.de", "pookmail.com", "privacy.net", "proxymail.eu",
  "prtnx.com", "putthisinyourspamdatabase.com", "qq.com", "quickinbox.com",
  "rcpt.at", "reallymymail.com", "recode.me", "recursor.net",
  "regbypass.com", "rmqkr.net", "royal.net", "rppkn.com",
  "rtrtr.com", "s0ny.net", "safe-mail.net", "safersignup.de",
  "safetymail.info", "sandelf.de", "saynotospams.com", "scatmail.com",
  "schafmail.de", "selfdestructingmail.com", "sendspamhere.com",
  "shiftmail.com", "shitmail.me", "shortmail.net", "sibmail.com",
  "skeefmail.com", "slaskpost.se", "slipry.net", "slopsbox.com",
  "smashmail.de", "smellfear.com", "snakemail.com", "sneakemail.com",
  "snkmail.com", "sofimail.com", "sofort-mail.de", "softpls.asia",
  "sogetthis.com", "soodonims.com", "spam.la", "spam.su",
  "spamavert.com", "spambob.com", "spambob.net", "spambob.org",
  "spambog.com", "spambog.de", "spambog.ru", "spambox.us",
  "spamcannon.com", "spamcannon.net", "spamcero.com", "spamcon.org",
  "spamcorptastic.com", "spamcowboy.com", "spamcowboy.net",
  "spamcowboy.org", "spamday.com", "spamex.com", "spamfighter.cf",
  "spamfighter.ga", "spamfighter.gq", "spamfighter.ml", "spamfighter.tk",
  "spamfree24.org", "spamgoes.in", "spamherelots.com", "spamhereplease.com",
  "spamhole.com", "spamify.com", "spaminator.de", "spamkill.info",
  "spaml.de", "spammotel.com", "spamobox.com", "spamoff.de",
  "spamslicer.com", "spamspot.com", "spamstack.net", "spamthis.co.uk",
  "spamthisplease.com", "spamtrail.com", "spamtroll.net", "speed.1s.fr",
  "superrito.com", "suremail.info", "svk.jp", "sweetxxx.de",
  "tafmail.com", "tagyoureit.com", "talkinator.com", "tapchicuoihoi.com",
  "teewars.org", "teleworm.com", "teleworm.us", "temp.emeraldcraft.com",
  "temp.headstrong.de", "tempail.com", "tempalias.com", "tempe4mail.com",
  "tempemail.biz", "tempemail.co.za", "tempemail.com", "tempemail.net",
  "tempinbox.com", "tempinbox.co.uk", "tempmail.eu", "tempmail.it",
  "tempmail2.com", "tempmaildemo.com", "tempmailer.com", "tempmailer.de",
  "tempomail.fr", "temporarily.de", "temporarioemail.com.br",
  "temporaryemail.net", "temporaryemail.us", "temporaryforwarding.com",
  "temporaryinbox.com", "temporarymailaddress.com", "tempthe.net",
  "thankyou2010.com", "thc.st", "thecriminals.com", "thejoker5.com",
  "thisisnotmyrealemail.com", "thismail.net", "throwawayemailaddress.com",
  "tilien.com", "tittbit.in", "tizi.com", "tmailinator.com",
  "toiea.com", "toomail.biz", "topranklist.de", "tradermail.info",
  "trash-amil.com", "trash-mail.at", "trash-mail.com", "trash-mail.de",
  "trash2009.com", "trashdevil.com", "trashdevil.de", "trashemail.de",
  "trashmail.at", "trashmail.de", "trashmail.me", "trashmail.net",
  "trashmail.org", "trashmail.ws", "trashmailer.com", "trashymail.com",
  "trashymail.net", "trbvm.com", "trbvn.com", "trialmail.de",
  "trickmail.net", "trillianpro.com", "turual.com", "twinmail.de",
  "tyldd.com", "uggsrock.com", "umail.net", "upliftnow.com",
  "uplipht.com", "venompen.com", "veryrealemail.com", "viditag.com",
  "viewcastmedia.com", "viewcastmedia.net", "viewcastmedia.org",
  "vomoto.com", "vpn.st", "vsimcard.com", "vubby.com",
  "wasteland.rfc822.org", "webemail.me", "weg-werf-email.de",
  "wegwerf-emails.de", "wegwerfadresse.de", "wegwerfemail.com",
  "wegwerfemail.de", "wegwerfmail.de", "wegwerfmail.info",
  "wegwerfmail.net", "wegwerfmail.org", "wh4f.org", "whatiaas.com",
  "whatpaas.com", "whyspam.me", "wickmail.net", "wilemail.com",
  "willhackforfood.biz", "willselfdestruct.com", "winemaven.info",
  "wronghead.com", "wuzup.net", "wuzupmail.net", "wwwnew.eu",
  "xagloo.com", "xemaps.com", "xents.com", "xmaily.com",
  "xoxy.net", "yapped.net", "yeah.net", "yep.it",
  "yogamaven.com", "yomail.info", "yopmail.fr", "yopmail.net",
  "ypmail.webarnak.fr.eu.org", "yuurok.com", "zehnminutenmail.de",
  "zippymail.info", "zoaxe.com", "zoemail.org",
  // Additional popular ones
  "mailnator.com", "maildrop.cc", "dispostable.com", "fakemailgenerator.com",
  "emailfake.com", "crazymailing.com", "tempail.com", "burnermail.io",
  "mailsac.com", "inboxkitten.com", "33mail.com", "anonaddy.com",
]);

/**
 * Check if an email domain is a known disposable/temporary email service.
 * @param email The email address to check
 * @returns true if the email is from a disposable domain
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Get a user-friendly error message for disposable email rejection.
 */
export function getDisposableEmailError(): string {
  return "Please use a permanent email address. Temporary or disposable email addresses are not allowed.";
}
