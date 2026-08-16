import { jest } from "@jest/globals";
import apiService from "../src/frontend/js/services/api.js";
import { AuthService } from "../src/frontend/js/services/authService.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { userManager } from "../src/frontend/js/userManager.js";

const certifications = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"];

describe("sincronização da certificação em estudo", () => {
  beforeEach(() => {
    localStorage.clear();
    SessionManager.persist({
      user: {
        id: "user-sync",
        email: "student@a3data.com.br",
        role: "student",
        language: "pt",
        certification: "clf-c02",
      },
      accessToken: "token-sync",
      authenticationMode: "online",
    });
    jest.spyOn(apiService, "updateMyProfile").mockResolvedValue({
      success: true,
      data: { preferences: { certification: "SAA-C03" } },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test.each(certifications)("persiste %s na sessão oficial", async (certification) => {
    await userManager.updatePreferences({ certification: certification.toUpperCase() });

    expect(SessionManager.restore()?.user?.certification).toBe(certification);
    expect(apiService.updateMyProfile).toHaveBeenCalledWith({
      preferences: { certification },
    });
  });

  test("não deixa profile remoto stale sobrescrever uma escolha recente", async () => {
    SessionManager.update({ certification: "saa-c03" });
    SessionManager.updateSession({
      pendingPreferenceSync: {
        certification: "saa-c03",
        updatedAt: Date.now(),
      },
    });

    jest.spyOn(apiService, "getMe").mockResolvedValue({
      success: true,
      data: {
        id: "user-sync",
        email: "student@a3data.com.br",
        role: "STUDENT",
        certification: "CLF-C02",
      },
    });
    jest.spyOn(apiService, "getMyProfile").mockResolvedValue({
      success: true,
      data: {
        preferences: { language: "pt", certification: "CLF-C02" },
      },
    });
    jest.spyOn(apiService, "getModuleState").mockResolvedValue({
      success: true,
      data: null,
    });

    const restored = await AuthService.restoreSession();

    expect(restored.certification).toBe("saa-c03");
    expect(SessionManager.restore()?.user?.certification).toBe("saa-c03");
    expect(apiService.updateMyProfile).toHaveBeenCalledWith({
      preferences: { certification: "saa-c03" },
    });
  });
});
