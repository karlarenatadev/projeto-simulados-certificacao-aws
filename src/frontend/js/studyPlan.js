import apiService from "../services/api.js";
import userManager from "./userManager.js";

const btnGenerate = document.getElementById("btnGenerate");
const certSelect = document.getElementById("certSelect");
const sprintMap = document.getElementById("sprintMap");
const planDetails = document.getElementById("planDetails");
const sprintProgress = document.getElementById("sprintProgress");

let currentPlan = null;
let selectedDay = null;

async function loadPlan() {
    const cert = certSelect.value;
    const user = await userManager.getOrCreateUser();
    
    btnGenerate.disabled = true;
    btnGenerate.textContent = "Carregando...";
    
    try {
        if (await apiService.isAvailable()) {
            // Tenta carregar plano ativo
            try {
                const response = await apiService.getActiveStudyPlan(user.id, cert);
                if (response && response.success && response.data) {
                    currentPlan = response.data;
                }
            } catch (e) {
                // Se não tiver (404), gera novo
                if (e.statusCode === 404) {
                    const res = await apiService.generateStudyPlan(user.id, cert);
                    if (res.success) {
                        currentPlan = res.data;
                    }
                } else {
                    throw e;
                }
            }
            
            if (currentPlan) {
                renderMap(currentPlan);
            }
        } else {
            alert("O servidor está offline. Não foi possível carregar o plano de estudos.");
        }
    } catch (error) {
        console.error("Erro ao carregar plano de estudos", error);
        alert("Erro ao carregar o plano de estudos.");
    } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<i class="fa-solid fa-bolt"></i> Gerar Plano`;
    }
}

function renderMap(plan) {
    sprintMap.innerHTML = "";
    planDetails.style.display = "none";
    
    let completedDays = 0;

    plan.schedule.forEach((daySchedule, index) => {
        const dayNum = index + 1;
        const isCompleted = daySchedule.completed;
        const isUnlocked = index === 0 || plan.schedule[index - 1].completed; // Desbloqueia se o anterior foi completo
        
        if (isCompleted) completedDays++;

        const node = document.createElement("div");
        node.className = `day-node ${isCompleted ? 'completed' : isUnlocked ? 'active' : 'locked'}`;
        
        let iconClass = "fa-lock";
        if (isUnlocked && !isCompleted) iconClass = "fa-play";
        if (isCompleted) iconClass = "fa-check";

        node.innerHTML = `
            <div class="day-number">Dia ${dayNum}</div>
            <div class="day-topic">${daySchedule.topic}</div>
            <i class="fa-solid ${iconClass} status-icon"></i>
        `;
        
        if (isUnlocked) {
            node.onclick = () => showDayDetails(daySchedule, dayNum, plan.id, isCompleted);
        }
        
        sprintMap.appendChild(node);
    });

    // Atualiza barra de progresso
    const progressPercentage = (completedDays / plan.schedule.length) * 100;
    sprintProgress.style.width = `${progressPercentage}%`;
}

function showDayDetails(daySchedule, dayNum, planId, isCompleted) {
    selectedDay = { daySchedule, dayNum, planId };
    
    document.getElementById("dayTitle").textContent = `Dia ${dayNum}: ${daySchedule.topic}`;
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";
    
    daySchedule.tasks.forEach(task => {
        taskList.innerHTML += `<li><i class="fa-solid fa-book-open"></i> ${task}</li>`;
    });
    
    const btnComplete = document.getElementById("btnCompleteDay");
    if (isCompleted) {
        btnComplete.style.display = "none";
    } else {
        btnComplete.style.display = "inline-flex";
        btnComplete.onclick = completeDay;
    }
    
    planDetails.style.display = "block";
    planDetails.scrollIntoView({ behavior: 'smooth' });
}

async function completeDay() {
    if (!selectedDay) return;
    
    const btnComplete = document.getElementById("btnCompleteDay");
    btnComplete.disabled = true;
    btnComplete.textContent = "Concluindo...";
    
    try {
        const response = await apiService.completeStudyPlanDay(selectedDay.planId, selectedDay.dayNum);
        
        if (response.success) {
            // Ganha XP 
            const user = await userManager.getOrCreateUser();
            await apiService.awardGamificationXP(user.id, 100, `sprint_day_${selectedDay.dayNum}`);
            
            alert(`Parabéns! Dia ${selectedDay.dayNum} concluído! Você ganhou +100 XP!`);
            loadPlan(); // Recarrega o plano para atualizar o mapa
        }
    } catch (error) {
        console.error("Erro ao concluir dia", error);
        alert("Erro ao concluir o dia.");
    } finally {
        btnComplete.disabled = false;
        btnComplete.textContent = "Concluir Dia e Ganhar XP!";
    }
}

btnGenerate.addEventListener("click", loadPlan);

// Auto-carrega se o usuário já tiver logado
loadPlan();
