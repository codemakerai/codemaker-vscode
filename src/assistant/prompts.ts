import { LanguageCode } from "codemaker-sdk";

const prompts: Record<string, Record<string, (...args: string[]) => string>> = {
    "explain": {
        "EN": (value: string) => `Explain ${value} method.`,
        "ES": (value: string) => `Explicar el método ${value}.`,
        "PT": (value: string) => `Explique o método ${value}.`,
        "JA": (value: string) => `${value} メソッドについて説明する。.`,
        "VI": (value: string) => `Giải thích phương thức ${value}.`,
        "TR": (value: string) => `Açıkla ${value} metodu.`,
        "KO": (value: string) => `${value} 메소드를 설명해주세요.`,
        "DE": (value: string) => `Erkläre die ${value}-Methode.`,
        "FR": (value: string) => `Expliquez la méthode ${value}.`,
        "IT": (value: string) => `Spiegare il metodo ${value}.`,
        "PL": (value: string) => `Opisz metodę ${value}.`,
        "ZH": (value: string) => `解释一下 ${value} 方法。`,
    },
    "review": {
        "EN": (value: string) => `Code review ${value} method.`,
        "ES": (value: string) => `Revisar el método ${value} de Code.`,
        "PT": (value: string) => `Rever código do método ${value}.`,
        "JA": (value: string) => `コード・レビュー ${value} メソッド。`,
        "VI": (value: string) => `Đánh giá mã ${value} phương thức.`,
        "TR": (value: string) => `Kod inceleme ${value} yöntemi.`,
        "KO": (value: string) => `코드 리뷰 ${value} 방법.`,
        "DE": (value: string) => `Code-Überprüfung ${value} Methode.`,
        "FR": (value: string) => `Méthode de révision de code ${value}.`,
        "IT": (value: string) => `Revisione del codice del metodo ${value}.`,
        "PL": (value: string) => `Zrecenzuj metodę ${value}.`,
        "ZH": (value: string) => `代码审查 ${value} 方法。`,
    },
    "test": {
        "EN": (value: string) => `Test ${value} method.`,
        "ES": (value: string) => `Probar el método ${value}.`,
        "PT": (value: string) => `Método de teste ${value}.`,
        "JA": (value: string) => `テスト ${value} メソッド。`,
        "VI": (value: string) => `Kiểm tra phương thức ${value}.`,
        "TR": (value: string) => `Test ${value} yöntemi.`,
        "KO": (value: string) => `테스트 ${value} 메소드..`,
        "DE": (value: string) => `Test ${value} Methode.`,
        "FR": (value: string) => `Tester la méthode ${value}.`,
        "IT": (value: string) => `Testa il metodo ${value}.`,
        "PL": (value: string) => `Napisz test do metody ${value}.`,
        "ZH": (value: string) => `测试 ${value} 方法。`,
    },
    "bugs": {
        "EN": (value: string) => `Find errors in ${value} method.`,
        "ES": (value: string) => `Encuentra errores en el método ${value}.`,
        "PT": (value: string) => `Encontrar erros no método ${value}.`,
        "JA": (value: string) => `メソッド ${value} にエラーを見つける。`,
        "VI": (value: string) => `Tìm lỗi trong phương thức $ {value}.`,
        "TR": (value: string) => `Bul ${value} metodundaki hataları.`,
        "KO": (value: string) => `${value} 메소드에서 오류를 찾으세요.`,
        "DE": (value: string) => `Finde Fehler im ${value} Methode.`,
        "FR": (value: string) => `Trouver des erreurs dans la méthode ${value}.`,
        "IT": (value: string) => `Trovare errori nel metodo ${value}.`,
        "PL": (value: string) => `Znajdź błędy w metodzie ${value}.`,
        "ZH": (value: string) => `在 ${value} 方法中查找错误。`,
    },
};

const resolve = (name: string, language?: LanguageCode, ...args: string[]): string => {
    const code = language as string;
    const prompt = prompts[name][code] || prompts[name][LanguageCode.en];
    return prompt(...args);
}

export const explain = (language?: LanguageCode, ...args: string[]): string => {
    return resolve("explain", LanguageCode.en, ...args);
};

export const review = (language?: LanguageCode, ...args: string[]): string => {
    return resolve("review", LanguageCode.en, ...args);
};

export const test = (language?: LanguageCode, ...args: string[]): string => {
    return resolve("test", LanguageCode.en, ...args);
};

export const bugs = (language?: LanguageCode, ...args: string[]): string => {
    return resolve("bugs", LanguageCode.en, ...args);
};