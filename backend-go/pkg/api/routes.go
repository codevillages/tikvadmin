package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter() *gin.Engine {
	router := gin.New()

	// 中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS 中间件
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// 创建控制器
	controller := NewKVController()

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"message": "TiKV Backend is healthy",
		})
	})

	// API 路由组
	api := router.Group("/api/kv")
	{
		// 删除所有数据 (避免与 /:key 冲突)
		api.DELETE("/all", controller.DeleteAllKVs)

		// 基本 CRUD 操作
		api.GET("", controller.ScanKVs)
		api.POST("", controller.CreateKV)
		api.PUT("", controller.UpdateKV)
		api.GET("/:key", controller.GetKV)
		api.DELETE("/:key", controller.DeleteKV)

		// 批量操作
		api.POST("/batch", controller.BatchOperations)
		api.DELETE("", controller.BatchDeleteKVs)

		// 事务操作
		api.POST("/transaction", controller.AtomicTransaction)

		// 统计和状态
		api.GET("/stats", controller.GetStats)
		api.GET("/cluster", controller.GetClusterStatus)
	}

	// 打印所有注册的路由
	fmt.Println("Registered routes:")
	for _, route := range router.Routes() {
		fmt.Printf("%s %s\n", route.Method, route.Path)
	}

	return router
}